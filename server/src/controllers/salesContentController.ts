import { Request, Response } from 'express';
import mongoose from 'mongoose';
import SalesContent, { ISalesContent, CONTENT_CATEGORIES } from '../models/SalesContent';
import Lead from '../models/Lead';
import { AuthRequest } from '../types/express';

/**
 * Get all sales content for tenant
 */
export const getAllContent = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const { category, tag, search, activeOnly } = req.query;

    const query: any = { tenantId };
    
    if (activeOnly === 'true') {
      query.isActive = true;
    }
    if (category) {
      query.category = category;
    }
    if (tag) {
      query.tags = tag;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const content = await SalesContent.find(query)
      .sort({ order: 1, createdAt: -1 })
      .populate('createdBy', 'name');

    res.json(content);
  } catch (error) {
    console.error('Error getting content:', error);
    res.status(500).json({ message: 'Failed to get content' });
  }
};

/**
 * Get content by ID
 */
export const getContentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const content = await SalesContent.findById(id)
      .populate('createdBy', 'name')
      .populate('shares.sharedBy', 'name')
      .populate('shares.leadId', 'name phone');

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json(content);
  } catch (error) {
    console.error('Error getting content:', error);
    res.status(500).json({ message: 'Failed to get content' });
  }
};

/**
 * Create new content
 */
export const createContent = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?._id;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const {
      title,
      description,
      category,
      contentType,
      fileUrl,
      externalUrl,
      thumbnailUrl,
      fileName,
      fileSize,
      mimeType,
      duration,
      visibleToRoles,
      allowSharing,
      allowDownload,
      tags,
      linkedCourses,
      validFrom,
      validUntil,
      isFeatured
    } = req.body;

    // Get max order for this category
    const maxOrder = await SalesContent.findOne({ tenantId, category })
      .sort({ order: -1 })
      .select('order');
    
    const content = await SalesContent.create({
      tenantId,
      title,
      description,
      category,
      contentType,
      fileUrl,
      externalUrl,
      thumbnailUrl,
      fileName,
      fileSize,
      mimeType,
      duration,
      visibleToRoles: visibleToRoles || ['TENANT_ADMIN', 'STAFF'],
      allowSharing: allowSharing !== false,
      allowDownload: allowDownload !== false,
      tags: tags || [],
      linkedCourses: linkedCourses || [],
      order: (maxOrder?.order || 0) + 1,
      validFrom,
      validUntil,
      isFeatured: isFeatured || false,
      isActive: true,
      createdBy: userId
    });

    res.status(201).json(content);
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(500).json({ message: 'Failed to create content' });
  }
};

/**
 * Update content
 */
export const updateContent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.tenantId;
    delete updates.createdBy;
    delete updates.shares;
    delete updates.shareCount;
    delete updates.viewCount;
    delete updates.downloadCount;

    const content = await SalesContent.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json(content);
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ message: 'Failed to update content' });
  }
};

/**
 * Delete content
 */
export const deleteContent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const content = await SalesContent.findByIdAndDelete(id);

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ message: 'Failed to delete content' });
  }
};

/**
 * Share content with a lead
 */
export const shareWithLead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { leadId, channel, message } = req.body;
    const userId = req.user?._id;

    const content = await SalesContent.findById(id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    if (!content.allowSharing) {
      return res.status(400).json({ message: 'Content sharing is not allowed' });
    }

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Add share record
    const shareRecord = {
      leadId: new mongoose.Types.ObjectId(leadId),
      sharedBy: userId,
      sharedAt: new Date(),
      channel,
      status: 'sent' as const
    };

    content.shares.push(shareRecord);
    content.shareCount += 1;
    content.lastSharedAt = new Date();
    await content.save();

    // Add activity to lead
    lead.activities.push({
      type: 'whatsapp',
      description: `Content shared: ${content.title}`,
      createdBy: userId,
      createdAt: new Date(),
      metadata: {
        contentId: content._id,
        contentTitle: content.title,
        channel,
        message
      }
    });
    await lead.save();

    // TODO: Actually send via WhatsApp/Email using the appropriate service
    // This would integrate with your existing WhatsApp/Email services

    res.json({
      message: 'Content shared successfully',
      shareRecord
    });
  } catch (error) {
    console.error('Error sharing content:', error);
    res.status(500).json({ message: 'Failed to share content' });
  }
};

/**
 * Track content view
 */
export const trackView = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { shareId } = req.body;

    const content = await SalesContent.findById(id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    content.viewCount += 1;

    // Update share status if shareId provided
    if (shareId) {
      const share = content.shares.find((s: any) => s._id?.toString() === shareId);
      if (share) {
        share.status = 'viewed';
        share.viewedAt = new Date();
      }
    }

    await content.save();

    res.json({ message: 'View tracked' });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({ message: 'Failed to track view' });
  }
};

/**
 * Track content download
 */
export const trackDownload = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const content = await SalesContent.findByIdAndUpdate(
      id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json({ message: 'Download tracked' });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ message: 'Failed to track download' });
  }
};

/**
 * Reorder content
 */
export const reorderContent = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { contentOrder } = req.body; // Array of { id, order }

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    for (const item of contentOrder) {
      await SalesContent.findOneAndUpdate(
        { _id: item.id, tenantId },
        { $set: { order: item.order } }
      );
    }

    res.json({ message: 'Content reordered successfully' });
  } catch (error) {
    console.error('Error reordering content:', error);
    res.status(500).json({ message: 'Failed to reorder content' });
  }
};

/**
 * Get content categories
 */
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    res.json(CONTENT_CATEGORIES);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ message: 'Failed to get categories' });
  }
};

/**
 * Get content by category with counts
 */
export const getContentByCategory = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const categoryCounts = await SalesContent.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId as string), isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalShares: { $sum: '$shareCount' },
          content: { 
            $push: {
              _id: '$_id',
              title: '$title',
              contentType: '$contentType',
              thumbnailUrl: '$thumbnailUrl',
              shareCount: '$shareCount',
              isFeatured: '$isFeatured'
            }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json(categoryCounts);
  } catch (error) {
    console.error('Error getting content by category:', error);
    res.status(500).json({ message: 'Failed to get content by category' });
  }
};

/**
 * Get featured content
 */
export const getFeaturedContent = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const content = await SalesContent.find({
      tenantId,
      isActive: true,
      isFeatured: true
    })
    .sort({ order: 1 })
    .limit(10);

    res.json(content);
  } catch (error) {
    console.error('Error getting featured content:', error);
    res.status(500).json({ message: 'Failed to get featured content' });
  }
};

/**
 * Get content sharing analytics
 */
export const getContentAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const { startDate, endDate } = req.query;

    const matchStage: any = { tenantId: new mongoose.Types.ObjectId(tenantId as string) };

    const analytics = await SalesContent.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalContent: { $sum: 1 },
          totalShares: { $sum: '$shareCount' },
          totalViews: { $sum: '$viewCount' },
          totalDownloads: { $sum: '$downloadCount' }
        }
      }
    ]);

    // Top shared content
    const topShared = await SalesContent.find({ tenantId })
      .sort({ shareCount: -1 })
      .limit(5)
      .select('title category shareCount viewCount');

    // Shares by channel breakdown
    const sharesByChannel = await SalesContent.aggregate([
      { $match: matchStage },
      { $unwind: '$shares' },
      {
        $group: {
          _id: '$shares.channel',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      summary: analytics[0] || { totalContent: 0, totalShares: 0, totalViews: 0, totalDownloads: 0 },
      topShared,
      sharesByChannel
    });
  } catch (error) {
    console.error('Error getting content analytics:', error);
    res.status(500).json({ message: 'Failed to get content analytics' });
  }
};

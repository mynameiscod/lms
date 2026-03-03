import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Content, { IContent } from '../models/Content';
import User from '../models/User';
import Course from '../models/Course';
import { AuthRequest } from '../types/express';

// CREATE - Admin creates new content
export const createContent = async (req: AuthRequest, res: Response) => {
  try {
    const { type, title, description, content, courseId, courseName, dueDate, priority, tags, visibility, code, language } = req.body;
    const userId = req.user?.id;  // Use 'id' not '_id' from JWT
    const tenantId = req.user?.tenantId;

    // Validate required fields
    if (!type || !title || !content || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, title, content, courseId',
      });
    }

    // Validate courseId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid courseId format: "${courseId}". Must be a valid MongoDB ID. Example: "507f1f77bcf86cd799439011"`,
      });
    }

    // Get user info for author field
    const user = await User.findById(userId).select('firstName lastName');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Handle file attachments if present
    const attachments = [];
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        attachments.push({
          name: file.originalname,
          url: `/uploads/${file.filename}`,
          size: file.size,
          type: file.mimetype,
          uploadedAt: new Date(),
        });
      }
    }

    // Create content document
    const newContent = new Content({
      type,
      title,
      description,
      content,
      code: type === 'snippet' ? code : undefined,
      language: type === 'snippet' ? language : undefined,
      dueDate: type === 'assignment' ? dueDate : undefined,
      priority,
      author: {
        userId,
        name: `${user.firstName} ${user.lastName}`,
        role: req.user?.role || 'ADMIN',
      },
      course: {
        courseId: new mongoose.Types.ObjectId(courseId),
        courseName,
      },
      tenant: tenantId,
      tags: tags || [],
      visibility: visibility || 'enrolled_only',
      attachments,
      isPublished: true,
    });

    await newContent.save();

    // Emit WebSocket event for real-time update
    const io = (req as any).app?.get('io');
    if (io) {
      io.to(`tenant_${tenantId}`).emit('content_created', {
        type: newContent.type,
        id: newContent._id,
        title: newContent.title,
        course: newContent.course,
        createdAt: newContent.createdAt,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Content created successfully',
      data: newContent,
    });
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create content',
      error: (error as Error).message,
    });
  }
};

// READ - Get all content for admin (with filters)
export const getAllContent = async (req: AuthRequest, res: Response) => {
  try {
    const { type, courseId, isPublished, page = 1, limit = 10 } = req.query;
    const tenantId = req.user?.tenantId;

    const query: any = { tenant: tenantId };

    if (type) query.type = type;
    if (courseId && mongoose.Types.ObjectId.isValid(courseId as string)) {
      query['course.courseId'] = new mongoose.Types.ObjectId(courseId as string);
    }
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const contents = await Content.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Content.countDocuments(query);

    res.status(200).json({
      success: true,
      data: contents,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get all content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content',
      error: (error as Error).message,
    });
  }
};

// READ - Get content for students (by course)
export const getStudentContent = async (req: AuthRequest, res: Response) => {
  try {
    const { type, courseId, page = 1, limit = 20 } = req.query;
    const tenantId = req.user?.tenantId;

    const query: any = {
      tenant: tenantId,
      isPublished: true,
    };

    if (type) query.type = type;
    if (courseId && mongoose.Types.ObjectId.isValid(courseId as string)) {
      query['course.courseId'] = new mongoose.Types.ObjectId(courseId as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const contents = await Content.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Content.countDocuments(query);

    res.status(200).json({
      success: true,
      data: contents,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get student content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content',
      error: (error as Error).message,
    });
  }
};

// READ - Get single content by ID
export const getContentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const content = await Content.findById(id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }

    // Increment view count
    content.viewCount = (content.viewCount || 0) + 1;
    await content.save();

    res.status(200).json({
      success: true,
      data: content,
    });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content',
      error: (error as Error).message,
    });
  }
};

// UPDATE - Update content (admin only)
export const updateContent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, content, dueDate, priority, tags, visibility, code, language } = req.body;

    const existingContent = await Content.findById(id);

    if (!existingContent) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }

    // Check authorization - only admin or creator can edit
    if (existingContent.author.userId.toString() !== req.user?.id.toString() && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - you can only edit your own content',
      });
    }

    // Handle new file attachments
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        existingContent.attachments?.push({
          name: file.originalname,
          url: `/uploads/${file.filename}`,
          size: file.size,
          type: file.mimetype,
          uploadedAt: new Date(),
        });
      }
    }

    // Update fields
    if (title) existingContent.title = title;
    if (description) existingContent.description = description;
    if (content) existingContent.content = content;
    if (dueDate) existingContent.dueDate = dueDate;
    if (priority) existingContent.priority = priority;
    if (tags) existingContent.tags = tags;
    if (visibility) existingContent.visibility = visibility;
    if (code && existingContent.type === 'snippet') existingContent.code = code;
    if (language && existingContent.type === 'snippet') existingContent.language = language;

    await existingContent.save();

    // Emit WebSocket event
    const io = (req as any).app?.get('io');
    if (io) {
      io.to(`tenant_${existingContent.tenant}`).emit('content_updated', {
        id: existingContent._id,
        type: existingContent.type,
        title: existingContent.title,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Content updated successfully',
      data: existingContent,
    });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update content',
      error: (error as Error).message,
    });
  }
};

// DELETE - Delete content (admin only)
export const deleteContent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const content = await Content.findById(id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found',
      });
    }

    // Check authorization
    if (content.author.userId.toString() !== req.user?.id.toString() && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - you can only delete your own content',
      });
    }

    await Content.findByIdAndDelete(id);

    // Emit WebSocket event
    const io = (req as any).app?.get('io');
    if (io) {
      io.to(`tenant_${content.tenant}`).emit('content_deleted', {
        id,
        type: content.type,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete content',
      error: (error as Error).message,
    });
  }
};

// UTILITY - Get content by type
export const getContentByType = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const tenantId = req.user?.tenantId;

    if (!['announcement', 'note', 'assignment', 'cheatsheet', 'snippet'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type',
      });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const contents = await Content.find({
      tenant: tenantId,
      type,
      isPublished: true,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Content.countDocuments({
      tenant: tenantId,
      type,
      isPublished: true,
    });

    res.status(200).json({
      success: true,
      data: contents,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get content by type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch content',
      error: (error as Error).message,
    });
  }
};

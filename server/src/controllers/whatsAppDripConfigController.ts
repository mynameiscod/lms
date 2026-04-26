import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import WhatsAppDripConfig, { DEFAULT_DRIP_SEQUENCES } from '../models/WhatsAppDripConfig';

// GET /api/v1/whatsapp-drip-config
export const getDripConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let config = await WhatsAppDripConfig.findOne({ tenantId: new mongoose.Types.ObjectId(req.tenantId!) });
    if (!config) {
      // Return defaults if not configured yet (not saved)
      return res.json({
        success: true,
        data: {
          sequences: DEFAULT_DRIP_SEQUENCES,
          isActive: true,
          isDefault: true,
        },
      });
    }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/v1/whatsapp-drip-config  (upsert whole config)
export const saveDripConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sequences, isActive } = req.body;
    if (!Array.isArray(sequences)) {
      return res.status(400).json({ success: false, message: 'sequences must be an array' });
    }

    const config = await WhatsAppDripConfig.findOneAndUpdate(
      { tenantId: new mongoose.Types.ObjectId(req.tenantId!) },
      {
        $set: {
          sequences,
          isActive: isActive !== undefined ? isActive : true,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, data: config, message: 'Drip configuration saved' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/v1/whatsapp-drip-config/sequence/:stageName  (update a single stage's sequence)
export const updateSequenceForStage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stageName } = req.params;
    const { messages, enabled } = req.body;

    let config = await WhatsAppDripConfig.findOne({ tenantId: new mongoose.Types.ObjectId(req.tenantId!) });
    if (!config) {
      // Bootstrap from defaults
      config = await WhatsAppDripConfig.create({
        tenantId: new mongoose.Types.ObjectId(req.tenantId!),
        sequences: DEFAULT_DRIP_SEQUENCES,
        isActive: true,
      });
    }

    const idx = config.sequences.findIndex(
      (s) => s.stageName.toLowerCase() === stageName.toLowerCase()
    );

    if (idx === -1) {
      // Add new stage sequence
      config.sequences.push({ stageName, messages: messages ?? [], enabled: enabled ?? true });
    } else {
      if (messages !== undefined) config.sequences[idx].messages = messages;
      if (enabled !== undefined) config.sequences[idx].enabled = enabled;
    }

    await config.save();
    res.json({ success: true, data: config, message: `Sequence for stage "${stageName}" updated` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/v1/whatsapp-drip-config/reset  (reset to defaults)
export const resetToDefaults = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = await WhatsAppDripConfig.findOneAndUpdate(
      { tenantId: new mongoose.Types.ObjectId(req.tenantId!) },
      { $set: { sequences: DEFAULT_DRIP_SEQUENCES, isActive: true } },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: config, message: 'Drip config reset to defaults' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

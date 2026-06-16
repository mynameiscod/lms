import { Request, Response } from 'express';
import mongoose from 'mongoose';
import BatchOffering from '../models/BatchOffering';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import { workingDateForDay } from '../utils/planSchedule';

const tenantId = (req: Request): string => (req as any).user?.tenantId || '';
const userId   = (req: Request): string => (req as any).user?.id || '';

/** Merge a template day's items with this offering's per-day override. */
export function effectiveItemsForDay(templateItems: any[], offering: any, dayNumber: number): any[] {
  const ov = offering?.dayOverrides?.find((o: any) => o.dayNumber === dayNumber);
  let items = (templateItems || []).map((it: any) => ({ ...it }));
  if (ov) {
    const removed = new Set((ov.removedItemIds || []).map((x: any) => String(x)));
    items = items.filter((it: any) => !removed.has(String(it._id)));
    items = items.concat((ov.addedItems || []).map((it: any) => ({ ...it })));
  }
  return items;
}

export const holidaySet = (offering: any): Set<string> => new Set<string>(offering?.holidays || []);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const listOfferings = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const filter: any = { tenantId: tId };
    if (req.query.curriculumId) filter.curriculumId = req.query.curriculumId;
    if (req.query.batchId) filter.batchId = req.query.batchId;
    if (req.query.status) filter.status = req.query.status;
    const offerings = await BatchOffering.find(filter).sort({ createdAt: -1 }).lean();
    res.json(offerings);
  } catch (err) {
    res.status(500).json({ message: 'Failed to list offerings', error: String(err) });
  }
};

export const createOffering = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { curriculumId, batchId, startDate, holidays } = req.body;

    const curriculum = await LearningCurriculum.findOne({ _id: curriculumId, tenantId: tId }).lean();
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });

    const BatchModel = mongoose.model('Batch');
    const batch = await BatchModel.findOne({ _id: batchId, tenantId: tId }).lean() as any;
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const offering = await BatchOffering.create({
      tenantId: tId,
      curriculumId,
      curriculumTitle: curriculum.title,
      batchId,
      batchName: batch.name,
      startDate: new Date(startDate),
      holidays: Array.isArray(holidays) ? holidays : [],
      dayOverrides: [],
      status: 'draft',
      createdBy: userId(req),
    });
    res.status(201).json(offering);
  } catch (err: any) {
    if (err.code === 11000) return res.status(400).json({ message: 'An offering for this curriculum + batch already exists' });
    res.status(500).json({ message: 'Failed to create offering', error: String(err) });
  }
};

export const getOffering = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const offering = await BatchOffering.findOne({ _id: req.params.id, tenantId: tId }).lean();
    if (!offering) return res.status(404).json({ message: 'Offering not found' });
    res.json(offering);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get offering', error: String(err) });
  }
};

export const updateOffering = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { startDate, holidays, status } = req.body;
    const set: any = {};
    if (startDate) set.startDate = new Date(startDate);
    if (Array.isArray(holidays)) set.holidays = holidays;
    if (status) set.status = status;
    const offering = await BatchOffering.findOneAndUpdate(
      { _id: req.params.id, tenantId: tId }, { $set: set }, { new: true }
    );
    if (!offering) return res.status(404).json({ message: 'Offering not found' });
    res.json(offering);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update offering', error: String(err) });
  }
};

export const deleteOffering = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    await BatchOffering.deleteOne({ _id: req.params.id, tenantId: tId });
    res.json({ message: 'Offering deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete offering', error: String(err) });
  }
};

// ─── Per-day override ──────────────────────────────────────────────────────────

export const upsertDayOverride = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const dayNumber = parseInt(req.params.day, 10);
    if (isNaN(dayNumber) || dayNumber < 1) return res.status(400).json({ message: 'Invalid day number' });
    const { addedItems, removedItemIds, note } = req.body;

    const offering = await BatchOffering.findOne({ _id: req.params.id, tenantId: tId });
    if (!offering) return res.status(404).json({ message: 'Offering not found' });

    const idx = offering.dayOverrides.findIndex(o => o.dayNumber === dayNumber);
    const payload: any = {
      dayNumber,
      addedItems: Array.isArray(addedItems) ? addedItems : [],
      removedItemIds: Array.isArray(removedItemIds) ? removedItemIds : [],
      note: note || '',
    };
    // Empty override → drop it.
    if (payload.addedItems.length === 0 && payload.removedItemIds.length === 0 && !payload.note) {
      if (idx >= 0) offering.dayOverrides.splice(idx, 1);
    } else if (idx >= 0) {
      offering.dayOverrides[idx] = payload;
    } else {
      offering.dayOverrides.push(payload);
    }
    await offering.save();
    res.json(offering);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save day override', error: String(err) });
  }
};

// ─── Effective day (admin preview): merged items + computed calendar date ───────

export const getOfferingDay = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const dayNumber = parseInt(req.params.day, 10);
    const offering = await BatchOffering.findOne({ _id: req.params.id, tenantId: tId }).lean();
    if (!offering) return res.status(404).json({ message: 'Offering not found' });

    const dayPlan = await DayPlan.findOne({ curriculumId: offering.curriculumId, dayNumber }).lean();
    const items = effectiveItemsForDay(dayPlan?.items || [], offering, dayNumber);
    const date = workingDateForDay(offering.startDate, dayNumber, holidaySet(offering));

    res.json({ dayNumber, date: date.toISOString(), items, override: offering.dayOverrides.find(o => o.dayNumber === dayNumber) || null });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get offering day', error: String(err) });
  }
};

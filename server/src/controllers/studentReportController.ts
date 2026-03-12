import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { studentReportService } from '../services/studentReportService';

export const getStudentReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const tenantId = req.tenantId!;

    const report = await studentReportService.getStudentReport(studentId, tenantId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    console.error('Error getting student report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get student report',
      error: error.message
    });
  }
};

export const searchStudents = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q } = req.query;
    const tenantId = req.tenantId!;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const students = await studentReportService.searchStudents(tenantId, q);

    res.json({
      success: true,
      data: students
    });
  } catch (error: any) {
    console.error('Error searching students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search students',
      error: error.message
    });
  }
};

export const getAllStudentsSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId } = req.query;
    const tenantId = req.tenantId!;

    const summaries = await studentReportService.getAllStudentsSummary(
      tenantId, 
      batchId as string | undefined
    );

    res.json({
      success: true,
      data: summaries
    });
  } catch (error: any) {
    console.error('Error getting students summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get students summary',
      error: error.message
    });
  }
};

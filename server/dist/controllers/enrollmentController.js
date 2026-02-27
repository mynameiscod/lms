"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCourseEnrollments = exports.getStudentEnrollments = exports.enrollStudent = void 0;
const enrollmentService_1 = require("../services/enrollmentService");
const enrollmentService = new enrollmentService_1.EnrollmentService();
const enrollStudent = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user?.id;
        if (!courseId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                error: 'Course ID is required'
            });
        }
        const enrollment = await enrollmentService.enrollStudent(userId, courseId, req.tenantId);
        res.status(201).json({
            success: true,
            message: 'Student enrolled successfully',
            data: enrollment
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.message
        });
    }
};
exports.enrollStudent = enrollStudent;
const getStudentEnrollments = async (req, res) => {
    try {
        const userId = req.user?.id;
        const enrollments = await enrollmentService.getStudentEnrollments(userId, req.tenantId);
        res.status(200).json({
            success: true,
            message: 'Enrollments fetched successfully',
            data: enrollments
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.message
        });
    }
};
exports.getStudentEnrollments = getStudentEnrollments;
const getCourseEnrollments = async (req, res) => {
    try {
        const { courseId } = req.params;
        const enrollments = await enrollmentService.getCourseEnrollments(courseId);
        res.status(200).json({
            success: true,
            message: 'Course enrollments fetched successfully',
            data: enrollments
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
            error: error.message
        });
    }
};
exports.getCourseEnrollments = getCourseEnrollments;
//# sourceMappingURL=enrollmentController.js.map
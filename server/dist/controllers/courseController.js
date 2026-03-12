"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleCourseStatus = exports.deleteCourse = exports.updateCourse = exports.getCourseById = exports.getCoursesByTenant = exports.createCourse = void 0;
const courseService_1 = require("../services/courseService");
const courseService = new courseService_1.CourseService();
const createCourse = async (req, res) => {
    try {
        const { title, code, description, category, level, instructor, thumbnail, duration, prerequisites, learningOutcomes } = req.body;
        if (!title || !code || !description || !category || !instructor) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                error: 'Title, code, description, category, and instructor are required'
            });
        }
        const courseData = {
            title,
            code,
            description,
            category,
            level: level || 'beginner',
            instructor,
            thumbnail,
            duration: duration || { value: 3, unit: 'months' },
            prerequisites: prerequisites || [],
            learningOutcomes: learningOutcomes || [],
            tenantId: req.tenantId,
            isPublished: false,
            isActive: true
        };
        const course = await courseService.createCourse(courseData);
        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: course
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
exports.createCourse = createCourse;
const getCoursesByTenant = async (req, res) => {
    try {
        const { isActive, isPublished } = req.query;
        const filters = {};
        if (isActive !== undefined)
            filters.isActive = isActive === 'true';
        if (isPublished !== undefined)
            filters.isPublished = isPublished === 'true';
        const courses = await courseService.getCoursesByTenant(req.tenantId, filters);
        res.status(200).json({
            success: true,
            message: 'Courses fetched successfully',
            data: courses
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
exports.getCoursesByTenant = getCoursesByTenant;
const getCourseById = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await courseService.getCourseById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found',
                error: 'Course does not exist'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Course fetched successfully',
            data: course
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
exports.getCourseById = getCourseById;
const updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const updateData = req.body;
        const course = await courseService.updateCourse(courseId, updateData);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found',
                error: 'Course does not exist'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            data: course
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
exports.updateCourse = updateCourse;
const deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await courseService.deleteCourse(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found',
                error: 'Course does not exist'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Course deleted successfully',
            data: course
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
exports.deleteCourse = deleteCourse;
const toggleCourseStatus = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { isActive, isPublished } = req.body;
        const updateData = {};
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (isPublished !== undefined)
            updateData.isPublished = isPublished;
        const course = await courseService.updateCourse(courseId, updateData);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found',
                error: 'Course does not exist'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Course status updated successfully',
            data: course
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
exports.toggleCourseStatus = toggleCourseStatus;
//# sourceMappingURL=courseController.js.map
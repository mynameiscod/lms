"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCourseById = exports.getCoursesByTenant = exports.createCourse = void 0;
const courseService_1 = require("../services/courseService");
const courseService = new courseService_1.CourseService();
const createCourse = async (req, res) => {
    try {
        const { title, description, category, level, instructor } = req.body;
        if (!title || !description || !category || !instructor) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                error: 'Title, description, category, and instructor are required'
            });
        }
        const courseData = {
            title,
            description,
            category,
            level: level || 'beginner',
            instructor,
            tenantId: req.tenantId,
            isPublished: false
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
        const courses = await courseService.getCoursesByTenant(req.tenantId);
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
//# sourceMappingURL=courseController.js.map
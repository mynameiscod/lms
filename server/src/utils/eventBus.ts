import { EventEmitter } from 'events';

/**
 * LMS Event Bus — lightweight cross-module communication.
 *
 * Modules publish events here instead of importing each other directly.
 * This keeps domain modules loosely coupled and makes the bus swappable
 * with Redis Pub/Sub in a future microservices migration.
 *
 * Usage:
 *   Publisher:  eventBus.emit('quiz.completed', { userId, quizId, score, tenantId });
 *   Subscriber: eventBus.on('quiz.completed', handler);
 *
 * Defined event contracts (grow as modules are added):
 *   'quiz.completed'          { userId, quizId, score, tenantId }
 *   'assignment.submitted'    { userId, assignmentId, submissionId, tenantId }
 *   'attendance.marked'       { userId, sessionId, status, tenantId }
 *   'placement.drive.created' { driveId, tenantId, targetYear }
 *   'batch.enrolled'          { userId, batchId, tenantId }
 */
class LMSEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow up to 50 listeners per event before memory-leak warning
    this.setMaxListeners(50);
  }
}

// Singleton — one bus for the entire server process
export const eventBus = new LMSEventBus();

import React, { useEffect, useState } from 'react';
import { batchApi, userApi } from '../../api';
import { Button, Modal, Input, Alert, Spinner } from '../../components/common';
import { Batch, User } from '../../types';
import './BatchesPage.css';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const BatchesPage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    timings: [{ day: 'Monday', startTime: '10:00', endTime: '11:30' }],
    instructors: [] as string[],
    capacity: 30
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchesRes, instructorsRes] = await Promise.all([
        batchApi.getBatches(),
        userApi.getUsers()
      ]);

      setBatches(batchesRes.data || []);
      // Filter instructors - only users with INSTRUCTOR role
      const instructorUsers = (instructorsRes.data || []).filter(
        (u: User) => u.role === 'INSTRUCTOR' || u.role === 'TENANT_ADMIN'
      );
      setInstructors(instructorUsers);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const calculateEndDate = (startDateStr: string) => {
    if (!startDateStr) return '';
    const startDate = new Date(startDateStr);
    const endDate = new Date(startDate.getTime() + 150 * 24 * 60 * 60 * 1000);
    return endDate.toISOString().split('T')[0];
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startDate = e.target.value;
    setFormData({
      ...formData,
      startDate,
      endDate: calculateEndDate(startDate)
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'capacity' ? parseInt(value) : value
    });
  };

  const handleTimingChange = (index: number, field: string, value: string) => {
    const newTimings = [...formData.timings];
    newTimings[index] = { ...newTimings[index], [field]: value };
    setFormData({ ...formData, timings: newTimings });
  };

  const addTiming = () => {
    setFormData({
      ...formData,
      timings: [
        ...formData.timings,
        { day: 'Monday', startTime: '10:00', endTime: '11:30' }
      ]
    });
  };

  const removeTiming = (index: number) => {
    if (formData.timings.length > 1) {
      const newTimings = formData.timings.filter((_, i) => i !== index);
      setFormData({ ...formData, timings: newTimings });
    }
  };

  const handleInstructorToggle = (instructorId: string) => {
    setFormData(prev => ({
      ...prev,
      instructors: prev.instructors.includes(instructorId)
        ? prev.instructors.filter(id => id !== instructorId)
        : [...prev.instructors, instructorId]
    }));
  };

  const openCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const endDate = calculateEndDate(today);

    setEditingBatch(null);
    setFormData({
      name: '',
      startDate: today,
      endDate,
      timings: [{ day: 'Monday', startTime: '10:00', endTime: '11:30' }],
      instructors: [],
      capacity: 30
    });
    setIsModalOpen(true);
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      startDate: batch.startDate.split('T')[0],
      endDate: batch.endDate.split('T')[0],
      timings: batch.timings,
      instructors: batch.instructors.map(i => i._id),
      capacity: batch.capacity || 30
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBatch(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.startDate || !formData.endDate || formData.timings.length === 0) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (editingBatch) {
        await batchApi.updateBatch(editingBatch._id, formData);
        setSuccess('Batch updated successfully');
      } else {
        await batchApi.createBatch(formData);
        setSuccess('Batch created successfully');
      }

      closeModal();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (batch: Batch) => {
    if (!window.confirm(`Are you sure you want to delete batch "${batch.name}"?`)) {
      return;
    }

    try {
      setError('');
      await batchApi.deleteBatch(batch._id);
      setSuccess('Batch deleted successfully');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete batch');
    }
  };

  const handleDeactivate = async (batch: Batch) => {
    try {
      setError('');
      await batchApi.deactivateBatch(batch._id);
      setSuccess('Batch deactivated successfully');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate batch');
    }
  };

  const handleActivate = async (batch: Batch) => {
    try {
      setError('');
      await batchApi.activateBatch(batch._id);
      setSuccess('Batch activated successfully');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to activate batch');
    }
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="batches-page">
      <div className="batches-header">
        <div className="batches-header-text">
          <h1>Batch Management</h1>
          <p className="batches-subtitle">Create and manage batches with schedules and instructors</p>
        </div>
        <Button onClick={openCreateModal}>+ Create Batch</Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="batches-grid">
        {batches.length === 0 ? (
          <div className="no-batches">
            <p>No batches found. Create your first batch to get started.</p>
          </div>
        ) : (
          batches.map((batch) => (
            <div key={batch._id} className="batch-card">
              <div className="batch-header">
                <div>
                  <h3>{batch.name}</h3>
                  <p className="batch-dates">
                    {new Date(batch.startDate).toLocaleDateString()} -{' '}
                    {new Date(batch.endDate).toLocaleDateString()}
                  </p>
                </div>
                <span className={`status-badge ${batch.isActive ? 'active' : 'inactive'}`}>
                  {batch.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="batch-info">
                <div className="info-item">
                  <span className="label">Capacity</span>
                  <span className="value">{batch.enrolledCount}/{batch.capacity}</span>
                </div>
              </div>

              <div className="batch-schedule">
                <span className="schedule-label">Schedule</span>
                <div className="timings-list">
                  {batch.timings.map((timing, idx) => (
                    <div key={idx} className="timing-item">
                      <span className="day">{timing.day}</span>
                      <span className="time">
                        {timing.startTime} - {timing.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="batch-instructors">
                <span className="instructors-label">Instructors ({batch.instructors.length})</span>
                <div className="instructors-list">
                  {batch.instructors.length === 0 ? (
                    <span className="no-instructors">No instructors assigned</span>
                  ) : (
                    batch.instructors.map((instructor) => (
                      <span key={instructor._id} className="instructor-tag">
                        {instructor.firstName} {instructor.lastName}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="batch-actions">
                <button className="action-btn edit-btn" onClick={() => openEditModal(batch)}>
                  Edit
                </button>
                {batch.isActive ? (
                  <button
                    className="action-btn deactivate-btn"
                    onClick={() => handleDeactivate(batch)}
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    className="action-btn activate-btn"
                    onClick={() => handleActivate(batch)}
                  >
                    Activate
                  </button>
                )}
                <button
                  className="action-btn delete-btn"
                  onClick={() => handleDelete(batch)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Batch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingBatch ? 'Edit Batch' : 'Create New Batch'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="batch-form">
          <Input
            type="text"
            name="name"
            label="Batch Name"
            placeholder="E.g., Python Batch - Week 1"
            value={formData.name}
            onChange={handleFormChange}
            required
          />

          <div className="form-row">
            <Input
              type="date"
              name="startDate"
              label="Start Date"
              value={formData.startDate}
              onChange={handleStartDateChange}
              required
            />
            <Input
              type="date"
              name="endDate"
              label="End Date (Auto-calculated)"
              value={formData.endDate}
              onChange={handleFormChange}
              required
            />
          </div>

          <Input
            type="number"
            name="capacity"
            label="Batch Capacity"
            value={formData.capacity.toString()}
            onChange={handleFormChange}
            required
          />

          {/* Timings Section */}
          <div className="timings-section">
            <label className="section-label">Class Timings</label>
            {formData.timings.map((timing, idx) => (
              <div key={idx} className="timing-row">
                <select
                  value={timing.day}
                  onChange={(e) => handleTimingChange(idx, 'day', e.target.value)}
                  className="day-select"
                >
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>

                <input
                  type="time"
                  value={timing.startTime}
                  onChange={(e) => handleTimingChange(idx, 'startTime', e.target.value)}
                  className="time-input"
                />

                <span className="time-separator">to</span>

                <input
                  type="time"
                  value={timing.endTime}
                  onChange={(e) => handleTimingChange(idx, 'endTime', e.target.value)}
                  className="time-input"
                />

                {formData.timings.length > 1 && (
                  <button
                    type="button"
                    className="remove-timing-btn"
                    onClick={() => removeTiming(idx)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="add-timing-btn"
              onClick={addTiming}
            >
              + Add Another Timing
            </button>
          </div>

          {/* Instructors Section */}
          <div className="instructors-section">
            <label className="section-label">Assign Instructors</label>
            <div className="instructors-grid">
              {instructors.length === 0 ? (
                <p className="no-options">No instructors available</p>
              ) : (
                instructors.map((instructor) => (
                  <label key={instructor._id} className="instructor-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.instructors.includes(instructor._id)}
                      onChange={() => handleInstructorToggle(instructor._id)}
                    />
                    <span>{instructor.firstName} {instructor.lastName}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="modal-actions">
            <Button type="button" onClick={closeModal} className="btn-secondary">
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingBatch ? 'Update Batch' : 'Create Batch'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BatchesPage;

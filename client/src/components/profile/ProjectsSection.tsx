import React, { useState } from 'react';
import './ProjectsSection.css';

interface Project {
  _id?: string;
  name: string;
  description: string;
  roles: string;
  techStack: string[];
}

interface ProjectsSectionProps {
  data: Project[];
  isEditing: boolean;
  onAdd: () => void;
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  data,
  isEditing,
  onAdd,
  onChange,
  onRemove,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleTechStackChange = (
    index: number,
    value: string
  ) => {
    const techArray = value
      .split(',')
      .map((tech) => tech.trim())
      .filter((tech) => tech);
    onChange(index, 'techStack', techArray);
  };

  return (
    <div className="projects-section">
      <div className="section-header">
        <div>
          <h3>Projects</h3>
          <p className="section-subtitle">
            Showcase up to 10 of your projects
          </p>
        </div>
        <span className="section-icon">💼</span>
      </div>

      {data.length === 0 && !isEditing && (
        <div className="empty-state">
          <p>No projects added yet</p>
        </div>
      )}

      <div className="projects-list">
        {data.map((project, index) => (
          <div
            key={project._id || index}
            className="project-card"
          >
            <div
              className="project-header"
              onClick={() =>
                setExpandedIndex(
                  expandedIndex === index ? null : index
                )
              }
            >
              <div className="project-title">
                <h4>
                  {isEditing ? (
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) =>
                        onChange(index, 'name', e.target.value)
                      }
                      placeholder="Project name"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    project.name || 'Untitled Project'
                  )}
                </h4>
                <p className="project-meta">
                  {project.techStack?.join(', ') || 'No tech stack'}
                </p>
              </div>
              <div className="project-actions">
                {isEditing && (
                  <button
                    className="remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                    title="Remove project"
                  >
                    ✕
                  </button>
                )}
                <span
                  className={`toggle-icon ${
                    expandedIndex === index ? 'open' : ''
                  }`}
                >
                  ▼
                </span>
              </div>
            </div>

            {expandedIndex === index && (
              <div className="project-content">
                <div className="form-group">
                  <label>Description</label>
                  {isEditing ? (
                    <textarea
                      value={project.description}
                      onChange={(e) =>
                        onChange(index, 'description', e.target.value)
                      }
                      placeholder="Project description"
                      rows={3}
                    />
                  ) : (
                    <p className="view-text">
                      {project.description || '—'}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label>Roles & Responsibilities</label>
                  {isEditing ? (
                    <textarea
                      value={project.roles}
                      onChange={(e) =>
                        onChange(index, 'roles', e.target.value)
                      }
                      placeholder="Your role in the project"
                      rows={2}
                    />
                  ) : (
                    <p className="view-text">{project.roles || '—'}</p>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    Tech Stack (comma-separated)
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={project.techStack?.join(', ') || ''}
                      onChange={(e) =>
                        handleTechStackChange(index, e.target.value)
                      }
                      placeholder="e.g., React, Node.js, MongoDB"
                    />
                  ) : (
                    <div className="tech-stack">
                      {project.techStack?.map((tech) => (
                        <span key={tech} className="tech-badge">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="add-project-btn-container">
          <button
            className="add-project-btn"
            onClick={onAdd}
            disabled={data.length >= 10}
            title={data.length >= 10 ? 'Maximum 10 projects' : 'Add project'}
          >
            + Add Project {data.length > 0 && `(${data.length}/10)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectsSection;

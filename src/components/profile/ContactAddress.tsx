import React, { useState } from 'react';
import './ContactAddress.css';

interface ContactAddressProps {
  data: {
    emergencyContact: {
      name: string;
      relationship: string;
      mobileNumber: string;
    };
    address: {
      presentAddress: string;
      permanentAddress: string;
    };
  };
  isEditing: boolean;
  onChange: (section: string, field: string, value: string) => void;
}

export const ContactAddress: React.FC<ContactAddressProps> = ({
  data,
  isEditing,
  onChange,
}) => {
  const [sameAsPresent, setSameAsPresent] = useState(false);

  const handleSameAsPresent = (checked: boolean) => {
    setSameAsPresent(checked);
    if (checked) {
      onChange(
        'address',
        'permanentAddress',
        data.address.presentAddress
      );
    }
  };

  return (
    <div className="contact-address">
      <div className="section-header">
        <h3>Contact & Address</h3>
        <span className="section-icon">📍</span>
      </div>

      {/* Emergency Contact Section */}
      <div className="subsection">
        <h4>Emergency Contact</h4>
        <div className="contact-grid">
          <div className="form-group">
            <label>Contact Person Name</label>
            {isEditing ? (
              <input
                type="text"
                value={data.emergencyContact.name}
                onChange={(e) =>
                  onChange(
                    'emergencyContact',
                    'name',
                    e.target.value
                  )
                }
                placeholder="Enter contact person's name"
              />
            ) : (
              <p className="view-text">
                {data.emergencyContact.name || '—'}
              </p>
            )}
          </div>

          <div className="form-group">
            <label>Relationship</label>
            {isEditing ? (
              <input
                type="text"
                value={data.emergencyContact.relationship}
                onChange={(e) =>
                  onChange(
                    'emergencyContact',
                    'relationship',
                    e.target.value
                  )
                }
                placeholder="e.g., Father, Mother, Sibling"
              />
            ) : (
              <p className="view-text">
                {data.emergencyContact.relationship || '—'}
              </p>
            )}
          </div>

          <div className="form-group">
            <label>Mobile Number</label>
            {isEditing ? (
              <input
                type="tel"
                value={data.emergencyContact.mobileNumber}
                onChange={(e) =>
                  onChange(
                    'emergencyContact',
                    'mobileNumber',
                    e.target.value
                  )
                }
                placeholder="Enter mobile number"
                pattern="[0-9-+()]+"
              />
            ) : (
              <p className="view-text">
                {data.emergencyContact.mobileNumber || '—'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Address Section */}
      <div className="subsection">
        <h4>Address Information</h4>

        <div className="form-group">
          <label>Present Address</label>
          {isEditing ? (
            <textarea
              value={data.address.presentAddress}
              onChange={(e) => {
                onChange(
                  'address',
                  'presentAddress',
                  e.target.value
                );
                if (sameAsPresent) {
                  onChange(
                    'address',
                    'permanentAddress',
                    e.target.value
                  );
                }
              }}
              placeholder="Enter your present address"
              rows={3}
            />
          ) : (
            <p className="view-text-large">
              {data.address.presentAddress || '—'}
            </p>
          )}
        </div>

        {isEditing && (
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="same-address"
              checked={sameAsPresent}
              onChange={(e) =>
                handleSameAsPresent(e.target.checked)
              }
            />
            <label htmlFor="same-address">
              Permanent address is same as present address
            </label>
          </div>
        )}

        <div className="form-group">
          <label>Permanent Address</label>
          {isEditing ? (
            <textarea
              value={data.address.permanentAddress}
              onChange={(e) =>
                onChange(
                  'address',
                  'permanentAddress',
                  e.target.value
                )
              }
              placeholder="Enter your permanent address"
              rows={3}
              disabled={sameAsPresent}
            />
          ) : (
            <p className="view-text-large">
              {data.address.permanentAddress || '—'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactAddress;

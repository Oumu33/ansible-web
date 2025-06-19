import React, { useState, useEffect } from 'react';
import { HostGroupFormData, HostGroup } from '../../services/hostService';

interface HostGroupFormProps {
  onSubmit: (data: HostGroupFormData) => Promise<void>;
  initialData?: HostGroup | null;
  submitButtonText?: string;
  onCancel?: () => void; // Optional cancel handler
}

const HostGroupForm: React.FC<HostGroupFormProps> = ({ onSubmit, initialData, submitButtonText = "Submit", onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
    } else {
      setName('');
      setDescription(''); // Reset form for create
    }
  }, [initialData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
        setError("Name is required.");
        return;
    }
    try {
      await onSubmit({ name, description });
      // On successful submit, clear form only if it's not for editing (initialData is null)
      if (!initialData) {
          setName('');
          setDescription('');
      }
      // Parent component handles actual success navigation or modal closing.
    } catch (err: any) {
      console.error("HostGroup form submission error:", err.response?.data || err.message);
      const errorData = err.response?.data;
      if (errorData) {
        if (errorData.name) setError(`Name: ${errorData.name.join(', ')}`);
        else if (errorData.detail) setError(errorData.detail);
        else setError(JSON.stringify(errorData));
      } else {
        setError(err.message || 'An error occurred.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fff' }}>
      {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
      <div>
        <label htmlFor="hg_name" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Name:</label>
        <input
          type="text"
          id="hg_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>
      <div>
        <label htmlFor="hg_description" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Description (Optional):</label>
        <textarea
          id="hg_description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>
      <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
        <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {submitButtonText}
        </button>
        {onCancel && (
            <button type="button" onClick={onCancel} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Cancel
            </button>
        )}
      </div>
    </form>
  );
};

export default HostGroupForm;

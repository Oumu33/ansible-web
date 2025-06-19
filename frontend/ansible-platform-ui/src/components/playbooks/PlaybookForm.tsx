import React, { useState, useEffect } from 'react';
import { PlaybookFormData, Playbook } from '../../services/playbookService';

interface PlaybookFormProps {
  onSubmit: (data: PlaybookFormData) => Promise<void>;
  initialData?: Playbook | null;
  submitButtonText?: string;
  onCancel?: () => void;
}

const PlaybookForm: React.FC<PlaybookFormProps> = ({ onSubmit, initialData, submitButtonText = "Submit", onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setContent(initialData.content || '');
    } else {
      setName('');
      setDescription('');
      setContent('');
    }
  }, [initialData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
        setError("Playbook name is required.");
        return;
    }
    if (!content.trim()) {
        setError("Playbook content cannot be empty.");
        return;
    }

    try {
      await onSubmit({ name, description, content });
      if (!initialData) { // If creating, clear form
        setName('');
        setDescription('');
        setContent('');
      }
    } catch (err: any) {
      console.error("Playbook form submission error:", err.response?.data || err.message);
      const errorData = err.response?.data;
      if (typeof errorData === 'string') setError(errorData);
      else if (errorData?.detail) setError(errorData.detail);
      else if (errorData?.name) setError(`Name: ${Array.isArray(errorData.name) ? errorData.name.join(', ') : errorData.name}`);
      else if (errorData?.content) setError(`Content: ${Array.isArray(errorData.content) ? errorData.content.join(', ') : errorData.content}`);
      else setError(err.message || 'An error occurred.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fff' }}>
      {error && <p style={{ color: 'red', marginBottom: '10px', border: '1px solid red', padding: '10px', borderRadius: '4px' }}>{error}</p>}
      <div>
        <label htmlFor="pb_name" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Name:</label>
        <input
          type="text"
          id="pb_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>
      <div>
        <label htmlFor="pb_description" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Description (Optional):</label>
        <textarea
          id="pb_description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>
      <div>
        <label htmlFor="pb_content" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Playbook Content (YAML):</label>
        <textarea
          id="pb_content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={18}
          required
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '0.9em', border: '1px solid #ccc', borderRadius: '4px', whiteSpace: 'pre' }}
          placeholder={"--- \n- name: Example Play\n  hosts: all\n  tasks:\n    - name: Ping hosts\n      ansible.builtin.ping:"}
        />
      </div>
      <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px'}}>
        {onCancel && (
            <button type="button" onClick={onCancel} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
            </button>
        )}
        <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {submitButtonText}
        </button>
      </div>
    </form>
  );
};

export default PlaybookForm;

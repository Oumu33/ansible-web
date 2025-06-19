import React, { useState, useEffect } from 'react';
import { Playbook, getPlaybooks } from '../../services/playbookService';
import { TaskExecutionTriggerData } from '../../services/taskService';

interface TaskTriggerFormProps {
  onSubmit: (data: TaskExecutionTriggerData) => Promise<void>;
  onCancel?: () => void;
  submitButtonText?: string;
}

const TaskTriggerForm: React.FC<TaskTriggerFormProps> = ({ onSubmit, onCancel, submitButtonText = "Run Playbook" }) => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string>('');
  const [targetSpec, setTargetSpec] = useState<string>('all');
  const [isLoadingPlaybooks, setIsLoadingPlaybooks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaybookList = async () => {
      setIsLoadingPlaybooks(true);
      setError(null);
      try {
        const data = await getPlaybooks();
        setPlaybooks(data);
        // Do not auto-select first playbook to ensure user makes a conscious choice
        // if (data.length > 0) {
        //   setSelectedPlaybookId(data[0].id.toString());
        // }
      } catch (err: any) {
        console.error("Failed to fetch playbooks for form:", err);
        setError("Could not load available playbooks. Ensure some playbooks exist.");
      } finally {
        setIsLoadingPlaybooks(false);
      }
    };
    fetchPlaybookList();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!selectedPlaybookId) {
      setError("Please select a playbook.");
      return;
    }
    if (!targetSpec.trim()) {
      setError("Target specification cannot be empty.");
      return;
    }
    try {
      await onSubmit({ playbook: parseInt(selectedPlaybookId, 10), target_spec: targetSpec });
      // Form reset or hiding is handled by parent component after successful submission
    } catch (err: any) {
      console.error("Task trigger form submission error:", err.response?.data || err.message);
      const errorData = err.response?.data;
      if (typeof errorData === 'string') setError(errorData);
      else if (errorData?.detail) setError(errorData.detail);
      else if (errorData?.playbook) setError(`Playbook: ${Array.isArray(errorData.playbook) ? errorData.playbook.join(', ') : errorData.playbook}`);
      else if (errorData?.target_spec) setError(`Target Spec: ${Array.isArray(errorData.target_spec) ? errorData.target_spec.join(', ') : errorData.target_spec}`);
      else setError(err.message || 'An error occurred while triggering the task.');
    }
  };

  if (isLoadingPlaybooks) {
    return <p>Loading available playbooks...</p>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fff' }}>
      {error && <p style={{ color: 'red', marginBottom: '10px', border: '1px solid red', padding: '10px', borderRadius: '4px' }}>{error}</p>}
      <div>
        <label htmlFor="playbook_select" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Select Playbook *:</label>
        <select
          id="playbook_select"
          value={selectedPlaybookId}
          onChange={(e) => setSelectedPlaybookId(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="" disabled>-- Select a Playbook --</option>
          {playbooks.map(pb => (
            <option key={pb.id} value={pb.id}>{pb.name}</option>
          ))}
        </select>
        {playbooks.length === 0 && !isLoadingPlaybooks && <p style={{fontSize: '0.9em', color: 'orange', marginTop: '5px'}}>No playbooks available. Please create one first.</p>}
      </div>
      <div>
        <label htmlFor="target_spec" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Target Specification *:</label>
        <input
          type="text"
          id="target_spec"
          value={targetSpec}
          onChange={(e) => setTargetSpec(e.target.value)}
          required
          placeholder='e.g., all, webservers, host1.example.com'
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <small style={{fontSize: '0.8em', color: '#555', display: 'block', marginTop: '3px'}}>Comma-separated host names, group names, or 'all'.</small>
      </div>
      <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px'}}>
        {onCancel && (
            <button type="button" onClick={onCancel} style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Cancel
            </button>
        )}
        <button type="submit" style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} disabled={playbooks.length === 0 || isLoadingPlaybooks}>
          {submitButtonText}
        </button>
      </div>
    </form>
  );
};

export default TaskTriggerForm;

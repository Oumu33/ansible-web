import React, { useState, useEffect } from 'react';
import { HostFormData, Host, HostGroup, getHostGroups } from '../../services/hostService';

interface HostFormProps {
  onSubmit: (data: HostFormData) => Promise<void>;
  initialData?: Host | null;
  submitButtonText?: string;
  onCancel?: () => void;
}

const HostForm: React.FC<HostFormProps> = ({ onSubmit, initialData, submitButtonText = "Submit", onCancel }) => {
  const [name, setName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [fqdn, setFqdn] = useState('');
  const [ansibleUser, setAnsibleUser] = useState('root');
  const [ansiblePort, setAnsiblePort] = useState<number | string>(22);
  const [sshKeyName, setSshKeyName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [variables, setVariables] = useState('{}'); // Store as JSON string in form

  const [allHostGroups, setAllHostGroups] = useState<HostGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false); // For loading groups

  useEffect(() => {
    const fetchAllGroups = async () => {
      setFormLoading(true);
      try {
        const groupsData = await getHostGroups();
        setAllHostGroups(groupsData);
      } catch (err) {
        console.error("Failed to fetch host groups for form:", err);
        setError("Could not load available host groups. Please ensure some exist or try again.");
      } finally {
        setFormLoading(false);
      }
    };
    fetchAllGroups();
  }, []);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setIpAddress(initialData.ip_address || '');
      setFqdn(initialData.fqdn || '');
      setAnsibleUser(initialData.ansible_user || 'root');
      setAnsiblePort(initialData.ansible_port || 22);
      setSshKeyName(initialData.ssh_key_name || '');
      setSelectedGroups(initialData.groups || []);
      setVariables(initialData.variables ? JSON.stringify(initialData.variables, null, 2) : '{}');
    } else {
      // Reset form for creation
      setName('');
      setIpAddress('');
      setFqdn('');
      setAnsibleUser('root');
      setAnsiblePort(22);
      setSshKeyName('');
      setSelectedGroups([]);
      setVariables('{}');
    }
  }, [initialData]);

  const handleGroupSelection = (groupId: number) => {
    setSelectedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    let parsedVariables = {};
    try {
      parsedVariables = variables.trim() === '' ? {} : JSON.parse(variables);
    } catch (e) {
      setError("Host variables are not valid JSON. Please provide a valid JSON object or an empty object {}.");
      return;
    }

    if (!name.trim()) {
        setError("Host name is required.");
        return;
    }
    if (!ipAddress.trim() && !fqdn.trim()) {
        setError("Either IP Address or FQDN must be provided for the host.");
        return;
    }

    try {
      await onSubmit({
        name,
        ip_address: ipAddress.trim() || undefined,
        fqdn: fqdn.trim() || undefined,
        ansible_user: ansibleUser,
        ansible_port: Number(ansiblePort),
        ssh_key_name: sshKeyName.trim() || undefined,
        groups: selectedGroups,
        variables: JSON.stringify(parsedVariables)
      });
       if (!initialData) { // If it's a create form, reset fields
        setName(''); setIpAddress(''); setFqdn(''); setAnsibleUser('root');
        setAnsiblePort(22); setSshKeyName(''); setSelectedGroups([]); setVariables('{}');
      }
    } catch (err: any) {
      console.error("Host form submission error:", err.response?.data || err.message);
      const errorData = err.response?.data;
      if (typeof errorData === 'string') setError(errorData);
      else if (errorData?.detail) setError(errorData.detail);
      else if (errorData) { // Handle field errors (e.g. name: ['error message'])
        const fieldErrors = Object.entries(errorData).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`).join('; ');
        setError(fieldErrors || 'An unknown error occurred.');
      }
      else setError(err.message || 'An error occurred.');
    }
  };

  if (formLoading && !initialData) return <p>Loading form dependencies...</p>; // Show loading only if it's not pre-filled

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fff' }}>
      {error && <p style={{ color: 'red', marginBottom: '10px', border: '1px solid red', padding: '10px', borderRadius: '4px' }}>{error}</p>}

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px'}}>
        <div>
          <label htmlFor="host_name" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Name *:</label>
          <input type="text" id="host_name" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}/>
        </div>
        <div>
          <label htmlFor="host_ip" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>IP Address:</label>
          <input type="text" id="host_ip" value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}/>
        </div>
        <div>
          <label htmlFor="host_fqdn" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>FQDN:</label>
          <input type="text" id="host_fqdn" value={fqdn} onChange={(e) => setFqdn(e.target.value)} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}/>
        </div>
        <div>
          <label htmlFor="host_user" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Ansible User:</label>
          <input type="text" id="host_user" value={ansibleUser} onChange={(e) => setAnsibleUser(e.target.value)} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}/>
        </div>
        <div>
          <label htmlFor="host_port" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Ansible Port:</label>
          <input type="number" id="host_port" value={ansiblePort} onChange={(e) => setAnsiblePort(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}/>
        </div>
        <div>
          <label htmlFor="host_ssh_key" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>SSH Key Name (Optional):</label>
          <input type="text" id="host_ssh_key" value={sshKeyName} onChange={(e) => setSshKeyName(e.target.value)} style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}/>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Member of Host Groups:</label>
        {allHostGroups.length === 0 && !formLoading && <p>No host groups available. You might need to create one first.</p>}
        {formLoading && <p>Loading groups...</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '4px' }}>
          {allHostGroups.map(group => (
            <label key={group.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '5px', borderRadius: '3px', backgroundColor: selectedGroups.includes(group.id) ? '#e0e0e0' : 'transparent' }}>
              <input
                type="checkbox"
                value={group.id}
                checked={selectedGroups.includes(group.id)}
                onChange={() => handleGroupSelection(group.id)}
              />
              {group.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="host_vars" style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Host Variables (JSON format):</label>
        <textarea
          id="host_vars"
          value={variables}
          onChange={(e) => setVariables(e.target.value)}
          rows={6}
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', fontFamily: 'monospace', border: '1px solid #ccc', borderRadius: '4px' }}
          placeholder='e.g., { "ansible_python_interpreter": "/usr/bin/python3" }'
        />
      </div>
      <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em' }}>
          {submitButtonText}
        </button>
        {onCancel && (
            <button type="button" onClick={onCancel} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em' }}>
            Cancel
            </button>
        )}
      </div>
    </form>
  );
};

export default HostForm;

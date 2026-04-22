import { useState, useEffect, useCallback } from 'react';
import { Typography, Box, Paper, Button, TextField, Grid, CircularProgress } from '@mui/material';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import ImageUpload from '../components/ImageUpload';

// A "dumb" presentational component for each card
const EventEditorCard = ({ title, description, onDescriptionChange, imgFields, onFileSelect, initialData, onSave, loading }) => {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, mb: 4, position: 'relative', overflow: 'hidden' }}>
      {loading && <CircularProgress sx={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}} />}
      <Typography variant="h6">{title}</Typography>
      <Box sx={{ opacity: loading ? 0.5 : 1 }}>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={description}
              onChange={onDescriptionChange}
            />
          </Grid>
          {imgFields.map((field, index) => (
            <Grid item key={field.key} xs={12} md={imgFields.length > 1 ? 6 : 12}>
              <ImageUpload
                label={`Image ${imgFields.length > 1 ? index + 1 : ''}`.trim()}
                onFileSelect={(file) => onFileSelect(field.key, file)}
                existingImageUrl={initialData[field.key]}
              />
            </Grid>
          ))}
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={onSave} disabled={loading}>Save Changes</Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default function UpcomingEventsPage() {
  const [pageData, setPageData] = useState({
    event_story_desc: '',
    event_outreach_desc: '',
  });
  const [imageFiles, setImageFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/settings');
      setPageData(response.data);
    } catch (error) {
      toast.error('Failed to load event data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDescriptionChange = (key, value) => {
    setPageData(prev => ({ ...prev, [key]: value }));
  };

  const handleFileSelect = (key, file) => {
    setImageFiles(prev => ({ ...prev, [key]: file }));
  };



  const handleSave = async (section: 'story' | 'outreach') => {
    setSavingSection(section);
    try {
      const formData = new FormData();
      const fieldsToSave = section === 'story'
        ? ['event_story_desc', 'event_story_img1', 'event_story_img2']
        : ['event_outreach_desc', 'event_outreach_img'];

      for (const key of fieldsToSave) {
        if (pageData[key] !== undefined && typeof pageData[key] === 'string') {
          formData.append(key, pageData[key]);
        }
        if (imageFiles[key]) {
          formData.append(key, imageFiles[key]);
        }
      }

      await apiClient.patch('/settings', formData);
      toast.success('Event updated successfully!');
      setImageFiles({});
      await fetchData();
    } catch (error) {
      toast.error('Failed to save event.');
    } finally {
      setSavingSection(null);
    }
  };

  if (loading && !pageData.event_story_desc) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        What Event Do you Wish to Update Today?
      </Typography>

      <EventEditorCard
        title="Fortnightly Story Reading Class"
        description={pageData.event_story_desc}
        onDescriptionChange={(e) => handleDescriptionChange('event_story_desc', e.target.value)}
        imgFields={[{ key: 'event_story_img1' }, { key: 'event_story_img2' }]}
        onFileSelect={handleFileSelect}
        initialData={pageData}
        onSave={() => handleSave('story')}
        loading={savingSection === 'story'}
      />

      <EventEditorCard
        title="Upcoming Outreach Program"
        description={pageData.event_outreach_desc}
        onDescriptionChange={(e) => handleDescriptionChange('event_outreach_desc', e.target.value)}
        imgFields={[{ key: 'event_outreach_img' }]}
        onFileSelect={handleFileSelect}
        initialData={pageData}
        onSave={() => handleSave('outreach')}
        loading={savingSection === 'outreach'}
      />
    </Box>
  );
}
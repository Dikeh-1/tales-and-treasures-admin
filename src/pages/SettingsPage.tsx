import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Box, Paper, Button, TextField, Grid, useMediaQuery } from '@mui/material';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import ImageUpload from '../components/ImageUpload';
import { useTheme } from '@mui/material/styles';

interface SettingsData {
  donationTarget?: number | string;
  childrenEngaged?: string;
  booksDonated?: string;
  donationsReceived?: string;
  outreachPrograms?: string;
  donatePageImage?: File | null;
  donatePageImageUrl?: string;
}

interface LiveStatsData {
  totalDonations?: number;
  financialDonationsReceived?: number;
}

export default function SettingsPage(): JSX.Element {
  const [settings, setSettings] = useState<Partial<SettingsData>>({});
  const [liveStats, setLiveStats] = useState<LiveStatsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/settings/page-data');
      const fetchedSettings: Partial<SettingsData> = response.data?.settings || {};
      const fetchedStats: LiveStatsData = response.data?.liveStats || {};

      setSettings(fetchedSettings);
      setLiveStats(fetchedStats);
    } catch (error) {
      toast.error('Failed to load settings.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (file: File | null) => {
    setSettings(prev => ({ ...prev, donatePageImage: file }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();

      Object.entries(settings).forEach(([key, val]) => {
        if (
          key === 'donatePageImage' ||
          key === 'donatePageImageUrl'
        ) {
          return;
        }
        if (typeof val !== 'undefined') {
          formData.append(key, String(val));
        }
      });

      if (settings.donatePageImage) {
        formData.append('donatePageImage', settings.donatePageImage);
      }

      await apiClient.patch('/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Settings saved successfully!');
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography>Loading settings...</Typography>;

  return (
    <Box sx={{ px: isMobile ? 2 : 4, py: 3 }}>
      <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
        Site Settings
      </Typography>
      <Paper sx={{ p: isMobile ? 2 : 3 }}>
        <Grid container spacing={isMobile ? 2 : 4}>
          {/* Fundraising Goal */}
          <Grid item xs={12}>
            <Typography variant="h6">Fundraising Goal</Typography>
            <TextField
              fullWidth
              label="Donation Target (₦)"
              name="donationTarget"
              type="number"
              value={settings.donationTarget ?? ''}
              onChange={handleInputChange}
              sx={{ mt: 1 }}
            />
          </Grid>

          {/* Impact Data */}
          <Grid item xs={12}>
            <Typography variant="h6">Impact Data</Typography>
            <Grid container spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Children Engaged"
                  name="childrenEngaged"
                  value={settings.childrenEngaged ?? ''}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Books Donated"
                  name="booksDonated"
                  type="number"
                  value={settings.booksDonated ?? ''}
                  onChange={handleInputChange}
                  helperText="Manual impact total (includes offline book support)."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Donations Received"
                  name="donationsReceived"
                  type="number"
                  value={settings.donationsReceived ?? ''}
                  onChange={handleInputChange}
                  helperText="Manual impact total shown on Home/About/Trust Strip."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Outreach Programs"
                  name="outreachPrograms"
                  value={settings.outreachPrograms ?? ''}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Financial Donations Received"
                  name="financialDonationsReceived"
                  value={Number(liveStats.financialDonationsReceived || 0)}
                  disabled
                  helperText="Live, auto-calculated from Donations history."
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Homepage Images */}
          <Grid item xs={12}>
            <Typography variant="h6">Homepage Images</Typography>
            <ImageUpload
              label="Donate Section Feature Image"
              onFileSelect={handleFileSelect}
              existingImageUrl={settings.donatePageImageUrl}
            />
          </Grid>

          {/* Save Button */}
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              fullWidth={isMobile}
              sx={{ maxWidth: isMobile ? '100%' : 200 }}
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

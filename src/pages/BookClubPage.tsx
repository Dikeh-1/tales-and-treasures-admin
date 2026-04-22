import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Grid,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Container,
  Stack,
  InputAdornment,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import ImageUpload from '../components/ImageUpload';

// Icons
import SaveIcon from '@mui/icons-material/Save';
import TitleIcon from '@mui/icons-material/Title';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import HistoryIcon from '@mui/icons-material/History';
import UpdateIcon from '@mui/icons-material/Update';
import CollectionsIcon from '@mui/icons-material/Collections';

// --- Types ---
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`bookclub-tabpanel-${index}`}
      aria-labelledby={`bookclub-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type SessionState = {
  title: string;
  description: string;
  day?: string;
  date?: string;
  time?: string;
  imageFile: File | null;
  imageUrl: string;
};

type HeroImageState = {
  imageFile: File | null;
  imageUrl: string;
};

export default function BookClubPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [tabValue, setTabValue] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // --- Data States ---
  const [lastSession, setLastSession] = useState<SessionState>({
    title: '',
    description: '',
    imageFile: null,
    imageUrl: '',
  });

  const [nextSession, setNextSession] = useState<SessionState>({
    title: '',
    description: '',
    day: 'Saturday',
    date: '',
    time: '',
    imageFile: null,
    imageUrl: '',
  });

  const [bookOfTheWeek, setBookOfTheWeek] = useState<SessionState>({
    title: '',
    description: '',
    imageFile: null,
    imageUrl: '',
  });

  const [heroImages, setHeroImages] = useState<HeroImageState[]>(
    Array(8).fill({ imageFile: null, imageUrl: '' })
  );
  
  const [heroSaving, setHeroSaving] = useState<boolean[]>(Array(8).fill(false));

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/settings');
      const settings = response.data || {};

      const buildImageUrl = (key: string) => {
        let url = settings[key] || '';
        if (url.includes('https//')) url = url.replace('https//', 'https://');
        // Assuming the API client or ImageUpload component handles the base URL, 
        // we usually want the relative path if it's local, or full if Cloudinary.
        // We will leave it as is, relying on the ImageUpload component to display it.
        return url;
      };

      setLastSession({
        title: settings.bookClub_lastSession_title || '',
        description: settings.bookClub_lastSession_desc || '',
        imageUrl: buildImageUrl('bookClub_lastSession_img'),
        imageFile: null,
      });

      setNextSession({
        title: settings.bookClub_nextSession_title || '',
        description: settings.bookClub_nextSession_desc || '',
        day: settings.bookClub_nextSession_day || 'Saturday',
        date: settings.bookClub_nextSession_date || '',
        time: settings.bookClub_nextSession_time || '',
        imageUrl: buildImageUrl('bookClub_nextSession_img'),
        imageFile: null,
      });

      setBookOfTheWeek({
        title: settings.bookClub_bookOfWeek_title || '',
        description: settings.bookClub_bookOfWeek_desc || '',
        imageUrl: buildImageUrl('bookClub_bookOfWeek_img'),
        imageFile: null,
      });

      const newHeroImages = Array(8).fill(null).map((_, index) => ({
        imageFile: null,
        imageUrl: buildImageUrl(`bookClub_hero${index + 1}`),
      }));
      setHeroImages(newHeroImages);

    } catch (error) {
      console.error(error);
      toast.error('Failed to load Book Club data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // --- Handlers ---

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSave = async (section: 'lastSession' | 'nextSession' | 'bookOfWeek', data: any, imageFile?: File | null) => {
    setSavingSection(section);
    try {
      let imageUrl = data.imageUrl || '';

      // 1. Upload Image if selected
      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('file', imageFile);
        // Note: Adjust endpoint if you have a specific one for settings uploads
        const uploadRes = await apiClient.post('/settings/upload', imageFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        imageUrl = uploadRes.data?.url || imageUrl;
      }

      // 2. Prepare Data Payload
      const keyMapping: Record<string, any> = {
        lastSession: { title: 'lastSession_title', description: 'lastSession_desc', img: 'lastSession_img' },
        nextSession: {
          title: 'nextSession_title',
          description: 'nextSession_desc',
          day: 'nextSession_day',
          date: 'nextSession_date',
          time: 'nextSession_time',
          img: 'nextSession_img',
        },
        bookOfWeek: { title: 'bookOfWeek_title', description: 'bookOfWeek_desc', img: 'bookOfWeek_img' },
      };

      const mapping = keyMapping[section];
      const textDataToSave: Record<string, any> = {};

      Object.keys(mapping).forEach((k) => {
        if (k === 'img') return; // Handle image separately
        const sourceKey = k === 'title' ? 'title' : k === 'description' ? 'description' : k;
        const value = (data as any)[sourceKey];
        if (value !== undefined) {
          textDataToSave[`bookClub_${mapping[k]}`] = value;
        }
      });

      // Add image URL to payload
      textDataToSave[`bookClub_${mapping.img}`] = imageUrl;

      // 3. Save Settings
      await apiClient.patch('/settings', textDataToSave);

      toast.success('Section updated successfully!');
      await fetchData(); // Refresh to ensure sync
    } catch (error) {
      console.error(error);
      toast.error('Failed to update section.');
    } finally {
      setSavingSection(null);
    }
  };

  const handleHeroImageChange = (index: number, file: File | null) => {
    const newHeroImages = [...heroImages];
    newHeroImages[index] = { ...newHeroImages[index], imageFile: file };
    setHeroImages(newHeroImages);
  };

  const handleSaveHeroImage = async (index: number) => {
    const heroItem = heroImages[index];
    if (!heroItem.imageFile) return;

    setHeroSaving(prev => { const n = [...prev]; n[index] = true; return n; });

    try {
      const formData = new FormData();
      // The backend likely expects the key name to match the setting name for direct upload
      // OR we upload generic and then patch setting. Assuming direct patch with file:
      formData.append(`bookClub_hero${index + 1}`, heroItem.imageFile);

      // If your backend supports uploading files directly to setting keys via PATCH /settings:
      await apiClient.patch('/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(`Hero image ${index + 1} updated!`);
      
      // Optimistic update or refetch
      const newHeroImages = [...heroImages];
      // We won't have the new URL unless backend returns it or we refetch. 
      // Let's refetch to be safe.
      await fetchData(); 
      
    } catch (error) {
      console.error(error);
      toast.error(`Failed to update hero image ${index + 1}.`);
    } finally {
      setHeroSaving(prev => { const n = [...prev]; n[index] = false; return n; });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ p: { xs: 2, md: 4 } }}>
      
      {/* --- Header --- */}
      <Box sx={{ mb: 4, textAlign: { xs: 'center', md: 'left' } }}>
        <Typography variant="h4" fontWeight="800" color="primary.main" gutterBottom>
          Book Club Manager
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your reading sessions, featured books, and gallery showcase.
        </Typography>
      </Box>

      {/* --- Tabs Navigation --- */}
      <Box sx={{ mb: 3 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 1, 
            borderRadius: 3, 
            bgcolor: 'background.paper', 
            border: `1px solid ${theme.palette.divider}`,
            display: 'inline-flex',
            width: { xs: '100%', md: 'auto' } // Full width on mobile
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "standard"}
            scrollButtons="auto"
            allowScrollButtonsMobile
            indicatorColor="primary"
            textColor="primary"
            sx={{
              '& .MuiTabs-indicator': { display: 'none' }, // Hide default underline
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                borderRadius: 2,
                minHeight: 48,
                px: 3,
                mx: 0.5,
                transition: 'all 0.2s',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  boxShadow: 2,
                },
                '&:hover:not(.Mui-selected)': {
                  bgcolor: 'action.hover',
                }
              }
            }}
          >
            <Tab icon={<HistoryIcon fontSize="small" />} iconPosition="start" label="Last Session" />
            <Tab icon={<UpdateIcon fontSize="small" />} iconPosition="start" label="Next Session" />
            <Tab icon={<AutoStoriesIcon fontSize="small" />} iconPosition="start" label="Book of Week" />
            <Tab icon={<CollectionsIcon fontSize="small" />} iconPosition="start" label="Hero Images" />
          </Tabs>
        </Paper>
      </Box>

      {/* --- Content Area --- */}
      
        {/* 1. Last Session Panel */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon color="primary" /> Session Details
                  </Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label="Session Title"
                      placeholder="e.g., The Great Gatsby Discussion"
                      value={lastSession.title}
                      onChange={(e) => setLastSession({ ...lastSession, title: e.target.value })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><TitleIcon color="action" /></InputAdornment>,
                      }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      label="Recap / Description"
                      placeholder="What happened in this session?"
                      value={lastSession.description}
                      onChange={(e) => setLastSession({ ...lastSession, description: e.target.value })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start" sx={{ mt: 1.5, alignSelf: 'flex-start' }}><DescriptionIcon color="action" /></InputAdornment>,
                      }}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={5}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="h6" gutterBottom>Featured Image</Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <ImageUpload
                      label="Upload Cover Photo"
                      onFileSelect={(file) => setLastSession({ ...lastSession, imageFile: file })}
                      existingImageUrl={lastSession.imageUrl}
                    />
                  </Box>

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={savingSection === 'lastSession' ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={() => handleSave('lastSession', lastSession, lastSession.imageFile)}
                    disabled={!!savingSection}
                    fullWidth
                    sx={{ mt: 3, py: 1.5, borderRadius: 2 }}
                  >
                    {savingSection === 'lastSession' ? 'Saving Changes...' : 'Save Last Session'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 2. Next Session Panel */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UpdateIcon color="primary" /> Upcoming Details
                  </Typography>
                  <Divider sx={{ mb: 3 }} />

                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label="Event Title"
                      placeholder="e.g., Monthly Meetup: Sci-Fi Genre"
                      value={nextSession.title}
                      onChange={(e) => setNextSession({ ...nextSession, title: e.target.value })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><TitleIcon color="action" /></InputAdornment>,
                      }}
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel>Day of Week</InputLabel>
                        <Select
                          value={nextSession.day}
                          label="Day of Week"
                          onChange={(e) => setNextSession({ ...nextSession, day: e.target.value as string })}
                          startAdornment={<InputAdornment position="start"><EventIcon fontSize="small" /></InputAdornment>}
                        >
                          {daysOfWeek.map((day) => (
                            <MenuItem key={day} value={day}>{day}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <TextField
                        fullWidth
                        type="date"
                        label="Date"
                        InputLabelProps={{ shrink: true }}
                        value={nextSession.date}
                        onChange={(e) => setNextSession({ ...nextSession, date: e.target.value })}
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><CalendarTodayIcon fontSize="small" /></InputAdornment>,
                        }}
                      />

                      <TextField
                        fullWidth
                        type="time"
                        label="Time"
                        InputLabelProps={{ shrink: true }}
                        value={nextSession.time}
                        onChange={(e) => setNextSession({ ...nextSession, time: e.target.value })}
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><AccessTimeIcon fontSize="small" /></InputAdornment>,
                        }}
                      />
                    </Stack>

                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Description / Agenda"
                      value={nextSession.description}
                      onChange={(e) => setNextSession({ ...nextSession, description: e.target.value })}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={5}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="h6" gutterBottom>Promo Image</Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Box sx={{ flexGrow: 1 }}>
                    <ImageUpload
                      label="Upload Promo Image"
                      onFileSelect={(file) => setNextSession({ ...nextSession, imageFile: file })}
                      existingImageUrl={nextSession.imageUrl}
                    />
                  </Box>

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={savingSection === 'nextSession' ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={() => handleSave('nextSession', nextSession, nextSession.imageFile)}
                    disabled={!!savingSection}
                    fullWidth
                    sx={{ mt: 3, py: 1.5, borderRadius: 2 }}
                  >
                    {savingSection === 'nextSession' ? 'Saving...' : 'Publish Next Session'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 3. Book of the Week Panel */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AutoStoriesIcon color="primary" /> Book Details
                  </Typography>
                  <Divider sx={{ mb: 3 }} />

                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label="Book Title & Author"
                      placeholder="e.g., 'Atomic Habits' by James Clear"
                      value={bookOfTheWeek.title}
                      onChange={(e) => setBookOfTheWeek({ ...bookOfTheWeek, title: e.target.value })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><TitleIcon color="action" /></InputAdornment>,
                      }}
                    />
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      label="Why we love it (Description)"
                      placeholder="Write a short review or summary..."
                      value={bookOfTheWeek.description}
                      onChange={(e) => setBookOfTheWeek({ ...bookOfTheWeek, description: e.target.value })}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="h6" gutterBottom>Book Cover</Typography>
                  <Divider sx={{ mb: 3 }} />
                  
                  <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'grey.50', borderRadius: 2, border: '1px dashed #ccc', p: 2 }}>
                    {/* Wrapper to constrain image size nicely for a book cover look */}
                    <Box sx={{ width: '100%', maxWidth: 300 }}>
                      <ImageUpload
                        label="Upload Cover"
                        onFileSelect={(file) => setBookOfTheWeek({ ...bookOfTheWeek, imageFile: file })}
                        existingImageUrl={bookOfTheWeek.imageUrl}
                      />
                    </Box>
                  </Box>

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={savingSection === 'bookOfWeek' ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={() => handleSave('bookOfWeek', bookOfTheWeek, bookOfTheWeek.imageFile)}
                    disabled={!!savingSection}
                    fullWidth
                    sx={{ mt: 3, py: 1.5, borderRadius: 2 }}
                  >
                    {savingSection === 'bookOfWeek' ? 'Saving...' : 'Update Book of the Week'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 4. Hero Images Panel */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" fontWeight="bold">Hero Gallery</Typography>
            <Typography variant="body2" color="text.secondary">
              These 8 images will be displayed in the main rotating banner of the Book Club page.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {heroImages.map((heroImage, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    borderRadius: 2, 
                    transition: 'box-shadow 0.3s',
                    '&:hover': { boxShadow: 4 }
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom fontWeight="600" color="text.secondary">
                      Slot {index + 1}
                    </Typography>
                    <Box sx={{ height: 200, mb: 2 }}>
                      <ImageUpload
                        label={`Image ${index + 1}`}
                        onFileSelect={(file) => handleHeroImageChange(index, file)}
                        existingImageUrl={heroImage.imageUrl}
                      />
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      disabled={!heroImage.imageFile || heroSaving[index]}
                      onClick={() => handleSaveHeroImage(index)}
                      startIcon={heroSaving[index] ? <CircularProgress size={16} /> : <SaveIcon />}
                    >
                      {heroSaving[index] ? 'Saving...' : 'Update Image'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      
    </Container>
  );
}
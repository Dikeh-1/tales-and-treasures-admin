import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardMedia,
  TextField,
  Checkbox,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  Paper,
  Tabs,
  Tab,
  Stack,
  Container,
  InputAdornment
} from '@mui/material';
import { toast } from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import apiClient from '../api/apiClient';
import ConfirmationModal from '../components/ConfirmationModal';
import CategoryFormModal from '../components/CategoryFormModal';

const API_BASE = String(apiClient.defaults.baseURL || '').replace(/\/$/, '');
const resolveMediaUrl = (url: string) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${API_BASE}${normalizedPath}`;
};

type ImageItem = {
  id: number;
  name?: string;
  url: string;
  category: string;
  [k: string]: any;
};

export default function GalleryPage(): React.ReactElement {
  const theme = useTheme();
  
  const [images, setImages] = useState<ImageItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryDetails, setCategoryDetails] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  
  // Selection & UI States
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'images' | 'category'; categoryName?: string } | null>(null);
  
  // Navigation
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);

  const [categoryModalOpen, setCategoryModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  /** Fetch data */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [imagesRes, categoriesRes] = await Promise.all([
        apiClient.get('/gallery'),
        apiClient.get('/gallery-categories'),
      ]);

      const imgs: ImageItem[] = (imagesRes.data || []).map((img: any) => ({
        ...img,
        url: resolveMediaUrl(img.url),
      }));
      setImages(imgs);

      const cats: string[] = (categoriesRes.data || []).map((c: any) => c.name);
      setCategories(cats);

      const detailsMap: Record<string, any> = {};
      (categoriesRes.data || []).forEach((c: any) => (detailsMap[c.name] = { ...c }));
      setCategoryDetails(detailsMap);

      // Set default category if none selected
      if (!selectedCategory && cats.length > 0) {
        setSelectedCategory(cats[0]);
        setTabIndex(0);
      } else if (selectedCategory && cats.includes(selectedCategory)) {
        // Keep current selection index sync
        setTabIndex(cats.indexOf(selectedCategory));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch gallery data.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  /** Tabs Handler */
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    setSelectedCategory(categories[newValue]);
    setIsSelectionMode(false);
    setSelectedImages([]);
  };

  /** Save Category */
  const handleSaveCategory = async (categoryData: { name: string }) => {
    if (!categoryData.name?.trim()) return toast.error('Name required.');
    setIsSaving(true);
    try {
      await apiClient.post('/gallery-categories', { name: categoryData.name });
      toast.success('Category created!');
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create category.');
    } finally {
      setIsSaving(false);
      setCategoryModalOpen(false);
    }
  };

  /** Upload Images */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCategory) return;
    const files = event.target.files;
    if (!files?.length) return;

    if (files.length > 50) {
      toast.error('Max 50 images at a time.');
      return;
    }

    setUploading(true);
    toast.loading('Uploading images...', { id: 'upload' });

    try {
      const formData = new FormData();
      formData.append('category', selectedCategory);

      const compressedFiles = await Promise.all(
        Array.from(files).map((file) =>
          imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true })
        )
      );

      compressedFiles.forEach((f) => formData.append('files', f));

      await apiClient.post('/gallery/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Upload successful!', { id: 'upload' });
      void fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Upload failed.', { id: 'upload' });
    } finally {
      setUploading(false);
      // Reset input
      if (event.target) event.target.value = '';
    }
  };

  /** Selection Logic */
  const handleImageToggle = (id: number) => {
    setSelectedImages(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  /** Deletion Logic */
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'images') {
        await apiClient.post('/gallery/delete-many', { ids: selectedImages });
        toast.success('Images deleted.');
        setSelectedImages([]);
        setIsSelectionMode(false);
      } else if (deleteTarget.type === 'category' && deleteTarget.categoryName) {
        // Client-side cleanup first if needed, but usually backend handles cascade
        // We'll just call the delete endpoint
        await apiClient.delete(`/gallery-categories/${encodeURIComponent(deleteTarget.categoryName)}`);
        toast.success('Category deleted.');
        
        // Reset selection to first available or null
        const remaining = categories.filter(c => c !== deleteTarget.categoryName);
        if (remaining.length > 0) {
          setSelectedCategory(remaining[0]);
          setTabIndex(0);
        } else {
          setSelectedCategory(null);
        }
      }
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Delete failed.');
    } finally {
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  /** Save Category Details */
  const handleSaveDetails = async () => {
    if (!selectedCategory) return;
    const details = categoryDetails[selectedCategory] || {};
    try {
      await apiClient.patch(`/gallery-categories/${encodeURIComponent(selectedCategory)}`, details);
      toast.success('Event details saved!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save details.');
    }
  };

  /** Update Detail State */
  const updateDetail = (field: string, val: any) => {
    if (!selectedCategory) return;
    setCategoryDetails(prev => ({
      ...prev,
      [selectedCategory]: { ...prev[selectedCategory], [field]: val }
    }));
  };

  return (
    <Container maxWidth="xl" sx={{ p: { xs: 1, md: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* --- Header Section --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            Gallery Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organize event photos by category
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          {!isSelectionMode ? (
            <>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => setCategoryModalOpen(true)}
              >
                New Category
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<EditIcon />} 
                onClick={() => setIsSelectionMode(true)}
                disabled={images.length === 0}
              >
                Select Photos
              </Button>
            </>
          ) : (
            <>
               <Button 
                variant="contained" 
                color="error" 
                startIcon={<DeleteIcon />}
                disabled={selectedImages.length === 0}
                onClick={() => { setDeleteTarget({ type: 'images' }); setDeleteModalOpen(true); }}
              >
                Delete ({selectedImages.length})
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<CancelIcon />} 
                onClick={() => { setIsSelectionMode(false); setSelectedImages([]); }}
              >
                Cancel
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {/* --- Category Navigation (Tabs) --- */}
      <Paper elevation={0} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
        <Tabs
          value={tabIndex !== -1 ? tabIndex : false}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': { 
              textTransform: 'none', 
              fontSize: '1rem', 
              fontWeight: 500, 
              minHeight: 48 
            }
          }}
        >
          {categories.map((cat) => (
            <Tab label={cat} key={cat} />
          ))}
          {categories.length === 0 && <Tab label="No Categories Found" disabled />}
        </Tabs>
      </Paper>

      {selectedCategory && categoryDetails[selectedCategory] && (
        <Grid container spacing={3} sx={{ flexGrow: 1 }}>
          
          {/* --- Left Column: Details & Upload --- */}
          <Grid item xs={12} md={4} lg={3}>
            <Stack spacing={3}>
              
              {/* Details Card */}
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                   <Typography variant="h6" fontWeight="bold">Event Details</Typography>
                   <Tooltip title="Delete this entire category">
                     <IconButton size="small" color="error" onClick={() => { setDeleteTarget({ type: 'category', categoryName: selectedCategory }); setDeleteModalOpen(true); }}>
                       <DeleteIcon />
                     </IconButton>
                   </Tooltip>
                </Box>
                
                <Stack spacing={2}>
                  <TextField
                    label="Event Venue"
                    size="small"
                    fullWidth
                    value={categoryDetails[selectedCategory].venue || ''}
                    onChange={(e) => updateDetail('venue', e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><PlaceIcon fontSize="small" /></InputAdornment>,
                    }}
                  />
                  <TextField
                    type="date"
                    label="Date"
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={categoryDetails[selectedCategory].date || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateDetail('date', val);
                      if (val) {
                         const d = new Date(val);
                         if (!isNaN(d.getTime())) updateDetail('day', d.toLocaleDateString('en-US', { weekday: 'long' }));
                      }
                    }}
                  />
                  <TextField
                    label="Day"
                    size="small"
                    fullWidth
                    value={categoryDetails[selectedCategory].day || ''}
                    onChange={(e) => updateDetail('day', e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><EventIcon fontSize="small" /></InputAdornment>,
                    }}
                  />
                  <Button 
                    variant="contained" 
                    size="small" 
                    startIcon={<SaveIcon />} 
                    onClick={handleSaveDetails}
                  >
                    Save Details
                  </Button>
                </Stack>
              </Paper>

              {/* Upload Card */}
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  borderStyle: 'dashed', 
                  borderWidth: 2,
                  borderColor: uploading ? 'primary.main' : 'divider',
                  bgcolor: 'action.hover',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'background.paper' }
                }}
              >
                {uploading ? (
                  <Stack alignItems="center" spacing={1}>
                    <CircularProgress size={24} />
                    <Typography variant="body2">Compressing & Uploading...</Typography>
                  </Stack>
                ) : (
                  <Button component="label" fullWidth sx={{ height: '100%', flexDirection: 'column', py: 2 }}>
                    <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold">Upload Photos</Typography>
                    <Typography variant="caption" color="text.secondary">Click to browse (Max 50)</Typography>
                    <input type="file" hidden multiple accept="image/*" onChange={handleFileChange} />
                  </Button>
                )}
              </Paper>
            </Stack>
          </Grid>

          {/* --- Right Column: Image Grid --- */}
          <Grid item xs={12} md={8} lg={9}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>
            ) : (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {images.filter(i => i.category === selectedCategory).length} photos in this category
                </Typography>
                
                <Grid container spacing={2}>
                  {images
                    .filter((img) => img.category === selectedCategory)
                    .map((image) => {
                      const isSelected = selectedImages.includes(image.id);
                      return (
                        <Grid item key={image.id} xs={6} sm={4} md={4} lg={3}>
                          <Card
                            elevation={isSelected ? 4 : 1}
                            sx={{
                              position: 'relative',
                              borderRadius: 2,
                              overflow: 'hidden',
                              border: isSelected ? `2px solid ${theme.palette.primary.main}` : 'none',
                              cursor: isSelectionMode ? 'pointer' : 'default',
                              transition: 'transform 0.2s',
                              '&:hover': { transform: 'scale(1.02)' }
                            }}
                            onClick={() => isSelectionMode && handleImageToggle(image.id)}
                          >
                            <CardMedia
                              component="img"
                              image={image.url}
                              loading="lazy"
                              sx={{ 
                                height: { xs: 120, sm: 160, md: 180 }, 
                                objectFit: 'cover',
                                opacity: isSelectionMode && !isSelected ? 0.6 : 1
                              }}
                            />
                            
                            {/* Selection Overlay */}
                            {isSelectionMode && (
                              <Box 
                                sx={{ 
                                  position: 'absolute', 
                                  top: 0, 
                                  right: 0, 
                                  left: 0, 
                                  bottom: 0, 
                                  bgcolor: isSelected ? 'rgba(25, 118, 210, 0.2)' : 'transparent',
                                  display: 'flex', 
                                  alignItems: 'flex-start', 
                                  justifyContent: 'flex-end',
                                  p: 1
                                }}
                              >
                                <Checkbox 
                                  checked={isSelected} 
                                  icon={<CheckCircleIcon color="disabled" />}
                                  checkedIcon={<CheckCircleIcon color="primary" />}
                                  sx={{ bgcolor: 'background.paper', borderRadius: '50%', p: 0.5 }}
                                />
                              </Box>
                            )}
                          </Card>
                        </Grid>
                      );
                    })}
                    
                    {images.filter(i => i.category === selectedCategory).length === 0 && (
                      <Grid item xs={12}>
                        <Box sx={{ textAlign: 'center', py: 8, opacity: 0.6 }}>
                           <Typography variant="h6">No photos yet</Typography>
                           <Typography variant="body2">Use the upload box to add memories to this event.</Typography>
                        </Box>
                      </Grid>
                    )}
                </Grid>
              </Box>
            )}
          </Grid>
        </Grid>
      )}

      {/* --- Modals --- */}
      <ConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={
          deleteTarget?.type === 'category'
            ? `Delete "${deleteTarget.categoryName}"? This will permanently remove all photos inside it.`
            : `Delete ${selectedImages.length} selected photo(s)? This cannot be undone.`
        }
        confirmColor="error"
      />

      <CategoryFormModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        initialData={null}
        loading={isSaving}
      />
    </Container>
  );
}

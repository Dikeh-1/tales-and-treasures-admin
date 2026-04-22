// src/pages/NewsletterPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  useMediaQuery,
  useTheme,
  Tooltip,
  MenuItem
} from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridRowsProp,
  GridActionsCellItem,
} from '@mui/x-data-grid';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import NewsletterFormModal from '../components/NewsletterFormModal';
import NewsletterDetailsModal from '../components/NewsletterDetailsModal';
import ConfirmationModal from '../components/ConfirmationModal';

/**
 * Fine-grained breakpoints (px).
 * These are container-width thresholds (not viewport-only) so they adapt if the panel is embedded, split-screen, etc.
 */
const BP_TINY = 360;   // very small phones
const BP_MOBILE = 600; // normal phones
const BP_TABLET = 900; // small tablets
const BP_DESKTOP = 1200; // large desktops

export default function NewsletterPage() {
  // === original state/handlers preserved ===
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [loading, setLoading] = useState(true);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedNewsletter, setSelectedNewsletter] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectionModel, setSelectionModel] = useState<number[]>([]);
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const theme = useTheme();
  const mqXs = useMediaQuery(theme.breakpoints.down('sm')); // helpful fallback

  // more granular size category derived from container width
  type SizeCategory = 'tiny' | 'mobile' | 'tablet' | 'desktop' | 'wide';
  const [sizeCategory, setSizeCategory] = useState<SizeCategory>('desktop');

  // Sorting (client-side; same UX as before)
  const [sortField, setSortField] = useState<'subject' | 'sentAt'>('sentAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  /** Fetch newsletters (original API usage) */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/newsletters', { params: dateFilter });
      setRows(response.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch newsletters.');
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /** Save newsletter - same as yours */
  const handleSave = async (newsletterData: { subject: string; content: string; mediaFile?: File | null }) => {
    if (!newsletterData.subject?.trim()) { toast.error('Subject is required.'); return; }
    if (!newsletterData.content || newsletterData.content.trim().length < 10) { toast.error('Newsletter content must be at least 10 characters.'); return; }

    const formData = new FormData();
    formData.append('subject', newsletterData.subject);
    formData.append('content', newsletterData.content);
    if (newsletterData.mediaFile) formData.append('mediaFile', newsletterData.mediaFile);

    try {
      setLoading(true);
      await apiClient.post('/newsletters', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Newsletter created successfully!');
      setFormModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Newsletter save failed:', error);
      toast.error((error as any)?.response?.data?.message || 'Failed to save newsletter.');
    } finally { setLoading(false); }
  };

  /** Delete single */
  const handleDelete = (id: number) => { setDeleteTarget(id); setDeleteModalOpen(true); };

  /** Bulk delete */
  const handleBulkDelete = () => {
    if (selectionModel.length === 0) { toast.error('Please select at least one newsletter to delete.'); return; }
    setDeleteTarget(null); setDeleteModalOpen(true);
  };

  /** Confirm deletion */
  const confirmDelete = async () => {
    try {
      setLoading(true);
      if (deleteTarget) {
        await apiClient.delete(`/newsletters/${deleteTarget}`);
        toast.success('Newsletter deleted successfully!');
      } else if (selectionModel.length > 0) {
        await apiClient.post('/newsletters/delete-many', { ids: selectionModel });
        toast.success('Selected newsletters deleted!');
      }
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete newsletter(s).');
    } finally {
      setLoading(false);
      setDeleteModalOpen(false);
      setSelectionModel([]);
    }
  };

  /** Client-side sorting applied consistently for both grid & list */
  const sortedRows = useMemo(() => {
    const copy = Array.isArray(rows) ? [...(rows as any[])] : [];
    copy.sort((a, b) => {
      const aVal = sortField === 'sentAt' ? new Date(a.sentAt || 0).getTime() : (String(a.subject || '').toLowerCase());
      const bVal = sortField === 'sentAt' ? new Date(b.sentAt || 0).getTime() : (String(b.subject || '').toLowerCase());
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortField, sortOrder]);

  /** DataGrid columns */
  const columns: GridColDef[] = [
    { field: 'subject', headerName: 'Subject', flex: 1, minWidth: 160 },
    {
      field: 'sentAt',
      headerName: 'Date Sent',
      minWidth: 140,
      width: 200,
      renderCell: (params) => params.value ? new Date(params.value).toLocaleString() : '-',
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      getActions: ({ id, row }) => [
        <GridActionsCellItem icon={<VisibilityIcon />} label="View" onClick={() => { setSelectedNewsletter(row); setDetailsModalOpen(true); }} showInMenu={false} />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => handleDelete(Number(id))} showInMenu={false} sx={{ color: 'error.main' }} />,
      ],
    },
  ];

  /** Compute minimum grid width so columns have room and grid becomes horizontally scrollable if needed */
  const minGridWidth = useMemo(() => {
    return columns.reduce((sum, c) => sum + (Number(c.minWidth ?? c.width ?? 120)), 0);
  }, [columns]);

  /** UI tuning per sizeCategory */
  const uiOptions = useMemo(() => {
    switch (sizeCategory) {
      case 'tiny': return { showGrid: false, pageSize: 4, rowHeight: 68, density: 'compact' as const, gridHeight: 'auto' };
      case 'mobile': return { showGrid: false, pageSize: 5, rowHeight: 72, density: 'compact' as const, gridHeight: 'auto' };
      case 'tablet': return { showGrid: true, pageSize: 7, rowHeight: 68, density: 'compact' as const, gridHeight: '56vh' };
      case 'desktop': return { showGrid: true, pageSize: 10, rowHeight: 80, density: 'standard' as const, gridHeight: '64vh' };
      default: return { showGrid: true, pageSize: 12, rowHeight: 80, density: 'standard' as const, gridHeight: '70vh' };
    }
  }, [sizeCategory]);

  /** List card for mobile/tiny views */
  const ListCard = ({ item }: { item: any }) => (
    <Paper elevation={1} sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{item.subject}</Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>{item.sentAt ? new Date(item.sentAt).toLocaleString() : ''}</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Tooltip title="View">
          <IconButton size="small" onClick={() => { setSelectedNewsletter(item); setDetailsModalOpen(true); }} aria-label="View newsletter">
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={() => handleDelete(item.id)} aria-label="Delete newsletter">
            <DeleteIcon fontSize="small" color="error" />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );

  /** ResizeObserver (container-aware) with debounce to set sizeCategory precisely */
  useEffect(() => {
    let timer: any = null;
    const applyCategory = (w: number) => {
      if (w <= BP_TINY) setSizeCategory('tiny');
      else if (w <= BP_MOBILE) setSizeCategory('mobile');
      else if (w <= BP_TABLET) setSizeCategory('tablet');
      else if (w <= BP_DESKTOP) setSizeCategory('desktop');
      else setSizeCategory('wide');
    };

    // prefer ResizeObserver for the container
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      const ro = new ResizeObserver((entries) => {
        const w = entries[0].contentRect.width;
        clearTimeout(timer);
        timer = setTimeout(() => applyCategory(w), 80);
      });
      ro.observe(containerRef.current);
      // initial
      applyCategory(containerRef.current.clientWidth || window.innerWidth);
      return () => { ro.disconnect(); clearTimeout(timer); };
    }

    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => applyCategory(containerRef.current?.clientWidth ?? window.innerWidth), 80);
    };
    window.addEventListener('resize', onResize);
    // initial
    applyCategory(containerRef.current?.clientWidth ?? window.innerWidth);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, []);

  // quick initial sync with media query to reduce FOUC on mount
  useEffect(() => {
    if (mqXs) setSizeCategory('mobile');
  }, [mqXs]);

  // ---- RENDER (keeps your structure but with robust, responsive behavior) ----
  return (
    <Paper ref={containerRef} sx={{ p: { xs: 1, sm: 2 }, width: '100%', height: sizeCategory === 'tiny' || sizeCategory === 'mobile' ? 'auto' : '85vh' }}>
      {/* Header & Filters - responsive stacking */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
        flexWrap: 'wrap',
        gap: 2,
      }}>
        <Typography variant="h5">Sent Newsletters</Typography>

        <Box sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          width: { xs: '100%', sm: 'auto' },
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <Box sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'space-between', sm: 'flex-start' },
            flexWrap: 'wrap'
          }}>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateFilter.startDate}
              onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
              sx={{ minWidth: { xs: '48%', sm: 140 } }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={dateFilter.endDate}
              onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
              sx={{ minWidth: { xs: '48%', sm: 140 } }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: { xs: 1, sm: 0 } }}>
            {selectionModel.length > 0 && (
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleBulkDelete} size={sizeCategory === 'tiny' ? 'small' : 'medium'}>
                Delete Selected
              </Button>
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormModalOpen(true)} size={sizeCategory === 'tiny' ? 'small' : 'medium'}>
              Create New
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Sorting controls */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>
          <TextField
            select
            label="Sort by"
            size={sizeCategory === 'tiny' ? 'small' : 'medium'}
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="sentAt">Date Sent</MenuItem>
            <MenuItem value="subject">Subject</MenuItem>
          </TextField>

          <Button onClick={() => setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc'))} size={sizeCategory === 'tiny' ? 'small' : 'medium'}>
            {sortOrder === 'asc' ? 'Asc' : 'Desc'}
          </Button>
        </Box>
      </Box>

      {/* CONTENT: List for small phones, DataGrid for larger sizes.
          Grid is wrapped in an overflow container with minWidth so columns never collapse. */}
      {uiOptions.showGrid ? (
        <Box sx={{ width: '100%', height: uiOptions.gridHeight, overflowX: 'auto' }}>
          <Box sx={{ minWidth: `${Math.max(minGridWidth, 560)}px`, width: '100%' }}>
            <DataGrid
              rows={sortedRows as GridRowsProp}
              columns={columns}
              loading={loading}
              checkboxSelection
              onRowSelectionModelChange={(newSelectionModel) => setSelectionModel(newSelectionModel as number[])}
              onRowClick={(params) => { setSelectedNewsletter(params.row); setDetailsModalOpen(true); }}
              getRowId={(row) => (row as any).id}
              pageSize={uiOptions.pageSize}
              rowsPerPageOptions={[5, 7, 10, 20]}
              disableSelectionOnClick
              columnVisibilityModel={{
                subject: true,
                sentAt: sizeCategory === 'tiny' || sizeCategory === 'mobile' ? false : true,
                actions: true,
              }}
              rowHeight={uiOptions.rowHeight}
              density={uiOptions.density as any}
              autoHeight={sizeCategory === 'tablet'}
              sx={{
                '& .MuiDataGrid-row': { cursor: 'pointer' },
                '& .MuiDataGrid-virtualScroller': { overflowX: 'auto' },
              }}
              sortingMode="client"
            />
          </Box>
        </Box>
      ) : (
        <Box>
          {sortedRows.length === 0 && !loading ? (
            <Typography variant="body2">No newsletters found.</Typography>
          ) : (
            <Box>
              {(sortedRows as any[]).map((r) => <ListCard key={r.id} item={r} />)}
            </Box>
          )}
        </Box>
      )}

      {/* Modals (unchanged wiring) */}
      <NewsletterFormModal open={formModalOpen} onClose={() => setFormModalOpen(false)} onSave={handleSave} loading={loading} />
      <NewsletterDetailsModal open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} newsletter={selectedNewsletter} />
      <ConfirmationModal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onConfirm={confirmDelete} title="Confirm Deletion" message={deleteTarget ? 'Are you sure you want to delete this newsletter?' : 'Are you sure you want to delete the selected newsletters?'} confirmColor="error" confirmText="Delete" />
    </Paper>
  );
}

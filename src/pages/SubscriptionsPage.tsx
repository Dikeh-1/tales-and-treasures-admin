import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  useMediaQuery,
  useTheme,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  DataGrid,
} from '@mui/x-data-grid';
import { XCircle } from 'lucide-react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

export default function SubscriptionsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disabling, setDisabling] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [subToDisable, setSubToDisable] = useState(null);

  // Fetch Subscriptions
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/subscriptions');
      setRows(response.data);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      toast.error('Failed to fetch subscriptions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Disable Click
  const handleDisableClick = (id) => {
    setSubToDisable(id);
    setConfirmModalOpen(true);
  };

  // Confirm Disable Subscription
  const confirmDisable = async () => {
    if (!subToDisable) return;
    setDisabling(true);
    try {
      await apiClient.post(`/subscriptions/${subToDisable}/disable`);
      toast.success('Subscription disabled successfully!');
      await fetchData();
    } catch (error) {
      console.error('Failed to disable subscription:', error);
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to disable subscription.';
      toast.error(message);
    } finally {
      setConfirmModalOpen(false);
      setSubToDisable(null);
      setDisabling(false);
    }
  };

  // Table Columns
  const columns = [
    { 
      field: 'email', 
      headerName: 'Donor Email', 
      flex: 1,
      minWidth: 150,
    },
    { 
      field: 'subscriptionCode', 
      headerName: 'Subscription Code', 
      flex: 1,
      minWidth: 150,
    },
    { 
      field: 'planCode', 
      headerName: 'Plan Code', 
      flex: 1,
      minWidth: 120,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'active' ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: (params) => {
        if (params.row.status === 'active') {
          return [
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<XCircle size={16} />}
              onClick={() => handleDisableClick(params.id)}
              disabled={disabling}
            >
              Disable
            </Button>,
          ];
        }
        return [];
      },
    },
  ];

  // Render mobile cards
  const renderMobileCards = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
          <CircularProgress />
        </Box>
      );
    }

    if (rows.length === 0) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="200px"
        >
          <Typography color="text.secondary">
            No active subscriptions found.
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 1 }}>
        {rows.map((row) => (
          <Card key={row.id} sx={{ mb: 2, boxShadow: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom noWrap>
                {row.email}
              </Typography>
              
              <Grid container spacing={1} sx={{ mb: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Subscription Code:
                  </Typography>
                  <Typography variant="body2" noWrap>
                    {row.subscriptionCode}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Plan Code:
                  </Typography>
                  <Typography variant="body2" noWrap>
                    {row.planCode}
                  </Typography>
                </Grid>
              </Grid>
              
              <Box display="flex" alignItems="center" mt={1}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  Status:
                </Typography>
                <Chip
                  label={row.status}
                  color={row.status === 'active' ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </CardContent>
            
            <Divider />
            
            {row.status === 'active' && (
              <CardActions>
                <Button
                  size="small"
                  color="error"
                  startIcon={<XCircle size={16} />}
                  onClick={() => handleDisableClick(row.id)}
                  disabled={disabling}
                  fullWidth
                >
                  Disable Subscription
                </Button>
              </CardActions>
            )}
          </Card>
        ))}
      </Box>
    );
  };

  return (
    <Paper sx={{ 
      p: { xs: 1, sm: 2, md: 3 }, 
      minHeight: '80vh',
      width: '100%',
    }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
        Recurring Subscriptions
      </Typography>

      {isMobile ? (
        renderMobileCards()
      ) : (
        <Box sx={{ height: '70vh', width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            sx={{
              '& .MuiDataGrid-cell': {
                padding: '8px',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: theme.palette.grey[100],
              },
            }}
            slots={{
              noRowsOverlay: () => (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Typography color="text.secondary">
                    No active subscriptions found.
                  </Typography>
                </Box>
              ),
            }}
          />
        </Box>
      )}

      {/* Confirmation Modal */}
      <Dialog
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        fullScreen={isMobile}
      >
        <DialogTitle>
          Confirm Disable Subscription
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to disable this subscription? This will stop all future payments from the donor.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmModalOpen(false)}
            disabled={disabling}
            size={isMobile ? "large" : "medium"}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDisable} 
            color="error" 
            variant="contained"
            disabled={disabling}
            size={isMobile ? "large" : "medium"}
          >
            {disabling ? 'Disabling...' : 'Yes, Disable'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

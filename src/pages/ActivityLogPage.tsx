import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
  Drawer,
  Chip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const actionIcons = {
  Updated: { icon: <EditIcon />, color: '#2563EB' },
  Created: { icon: <AddIcon />, color: '#16A34A' },
  Deleted: { icon: <DeleteIcon />, color: '#DC2626' },
  Archived: { icon: <DeleteIcon />, color: '#D97706' },
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  /** ✅ Fetch logs using apiClient */
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/activity-log');
      setLogs(response.data);
    } catch (error) {
      toast.error('Failed to fetch activity logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /** ✅ Apply filters dynamically */
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const userMatch = userFilter === 'All' || log.user === userFilter;
      const actionMatch = actionFilter === 'All' || log.action === actionFilter;
      return userMatch && actionMatch;
    });
  }, [logs, userFilter, actionFilter]);

  const users = ['All', ...Array.from(new Set(logs.map((log) => log.user)))];
  const actions = ['All', ...Array.from(new Set(logs.map((log) => log.action)))];

  const handleFilterApply = () => {
    setFilterDrawerOpen(false);
  };

  const handleFilterReset = () => {
    setUserFilter('All');
    setActionFilter('All');
  };

  const FilterSection = () => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 1 
      }}>
        <Typography variant="h6">Filters</Typography>
        {isMobile && (
          <IconButton onClick={() => setFilterDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
            <InputLabel>Filter by User</InputLabel>
            <Select
              value={userFilter}
              label="Filter by User"
              onChange={(e) => setUserFilter(e.target.value)}
            >
              {users.map((user) => (
                <MenuItem key={user} value={user}>
                  {user}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size={isMobile ? 'small' : 'medium'}>
            <InputLabel>Filter by Action</InputLabel>
            <Select
              value={actionFilter}
              label="Filter by Action"
              onChange={(e) => setActionFilter(e.target.value)}
            >
              {actions.map((action) => (
                <MenuItem key={action} value={action}>
                  {action}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        mt: 2,
        flexWrap: 'wrap' 
      }}>
        <Chip
          label="Reset Filters"
          onClick={handleFilterReset}
          variant="outlined"
          size="small"
        />
        {isMobile && (
          <Chip
            label="Apply Filters"
            onClick={handleFilterApply}
            color="primary"
            size="small"
          />
        )}
      </Box>
    </Box>
  );

  return (
    <Paper sx={{ 
      p: { xs: 1, sm: 2 }, 
      width: '100%',
      maxWidth: '1200px',
      mx: 'auto'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2,
        flexWrap: 'wrap',
        gap: 1
      }}>
        <Typography variant="h5" sx={{ fontSize: { xs: '1.4rem', sm: '1.5rem' } }}>
          Activity Log
        </Typography>
        
        {isMobile ? (
          <>
            <IconButton 
              onClick={() => setFilterDrawerOpen(true)}
              sx={{ display: { sm: 'none' } }}
            >
              <FilterListIcon />
            </IconButton>
            
            <Drawer
              anchor="bottom"
              open={filterDrawerOpen}
              onClose={() => setFilterDrawerOpen(false)}
              PaperProps={{
                sx: { 
                  borderTopLeftRadius: '12px', 
                  borderTopRightRadius: '12px',
                  p: 2 
                }
              }}
            >
              <FilterSection />
            </Drawer>
          </>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            flexWrap: 'wrap',
            justifyContent: { xs: 'flex-start', sm: 'flex-end' } 
          }}>
            {(userFilter !== 'All' || actionFilter !== 'All') && (
              <Chip
                label="Reset Filters"
                onClick={handleFilterReset}
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        )}
      </Box>

      {/* Filters for tablet/desktop */}
      {!isMobile && <FilterSection />}

      {/* Active filters indicator */}
      {(userFilter !== 'All' || actionFilter !== 'All') && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {userFilter !== 'All' && (
            <Chip
              label={`User: ${userFilter}`}
              onDelete={() => setUserFilter('All')}
              size="small"
            />
          )}
          {actionFilter !== 'All' && (
            <Chip
              label={`Action: ${actionFilter}`}
              onDelete={() => setActionFilter('All')}
              size="small"
            />
          )}
        </Box>
      )}

      {/* Logs */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredLogs.length > 0 ? (
        <List sx={{ bgcolor: 'background.paper' }}>
          {filteredLogs.map((log, index) => (
            <div key={log.id}>
              <ListItem alignItems="flex-start">
                <ListItemAvatar sx={{ 
                  minWidth: { xs: 50, sm: 60 }, 
                  mr: { xs: 1, sm: 2 } 
                }}>
                  <Avatar sx={{ 
                    bgcolor: actionIcons[log.action]?.color || '#64748B',
                    width: { xs: 40, sm: 48 },
                    height: { xs: 40, sm: 48 },
                  }}>
                    {actionIcons[log.action]?.icon}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography 
                      variant="body1" 
                      component="div"
                      sx={{ 
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        mb: 0.5
                      }}
                    >
                      <Box 
                        component="span" 
                        sx={{ fontWeight: 'bold' }}
                      >
                        {log.user}
                      </Box>
                      {` ${log.action.toLowerCase()}: ${log.details}`}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    >
                      {new Date(log.timestamp).toLocaleString('en-NG', {
                        timeZone: 'Africa/Lagos',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Typography>
                  }
                />
              </ListItem>
              {index < filteredLogs.length - 1 && (
                <Divider variant="inset" component="li" />
              )}
            </div>
          ))}
        </List>
      ) : (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 200,
          }}
        >
          <Typography 
            sx={{ 
              color: 'text.secondary', 
              textAlign: 'center',
              px: 2
            }}
          >
            {userFilter !== 'All' || actionFilter !== 'All' 
              ? 'No activities match your filters.' 
              : 'Sorry, nothing to display here.'
            }
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
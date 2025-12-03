import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { apiService } from '../../lib/api';

interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  product_count?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryStats {
  total_categories: number;
  active_categories: number;
  inactive_categories: number;
  categories_with_products: number;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/retailer/categories');
      setCategories(response.categories || []);
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
      setError(err.response?.data?.error || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await apiService.get('/retailer/categories/stats/summary');
      setStats(response.stats);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  // Filter categories
  const filteredCategories = categories.filter((c) => {
    const matchesSearch =
      !searchText ||
      c.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchText.toLowerCase());
    return matchesSearch;
  });

  // Handle add category
  const handleAddCategory = () => {
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setAddModalOpen(true);
  };

  // Handle edit category
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setFormName(category.name);
    setFormDescription(category.description || '');
    setEditModalOpen(true);
  };

  // Handle delete category
  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category);
    setDeleteModalOpen(true);
  };

  // Submit add category
  const handleSubmitAdd = async () => {
    if (!formName.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: any = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
      };

      // Add custom code if provided
      if (formCode.trim()) {
        payload.code = formCode.trim().toUpperCase();
      }

      await apiService.post('/retailer/categories', payload);
      setSuccess('Category created successfully!');
      setAddModalOpen(false);
      fetchCategories();
      fetchStats();
    } catch (err: any) {
      console.error('Error creating category:', err);
      setError(err.response?.data?.error || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  // Submit edit category
  const handleSubmitEdit = async () => {
    if (!formName.trim() || !selectedCategory) {
      setError('Category name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await apiService.put(`/retailer/categories/${selectedCategory.id}`, {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
      });

      setSuccess('Category updated successfully!');
      setEditModalOpen(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (err: any) {
      console.error('Error updating category:', err);
      setError(err.response?.data?.error || 'Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  // Submit delete category
  const handleSubmitDelete = async () => {
    if (!selectedCategory) return;

    try {
      setSaving(true);
      setError(null);

      await apiService.delete(`/retailer/categories/${selectedCategory.id}?force=true`);
      setSuccess('Category deleted successfully!');
      setDeleteModalOpen(false);
      setSelectedCategory(null);
      fetchCategories();
      fetchStats();
    } catch (err: any) {
      console.error('Error deleting category:', err);
      const errorMsg = err.response?.data?.error || 'Failed to delete category';
      const hint = err.response?.data?.hint;
      setError(hint ? `${errorMsg}. ${hint}` : errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading && categories.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Product Categories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage product categories for better inventory organization
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchCategories();
              fetchStats();
            }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCategory}
          >
            Add Category
          </Button>
        </Stack>
      </Box>

      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Categories
                </Typography>
                <Typography variant="h4" component="div" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  {stats.total_categories}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Active Categories
                </Typography>
                <Typography variant="h4" component="div" sx={{ color: 'success.main', fontWeight: 600 }}>
                  {stats.active_categories}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  With Products
                </Typography>
                <Typography variant="h4" component="div" sx={{ color: 'info.main', fontWeight: 600 }}>
                  {stats.categories_with_products}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Inactive Categories
                </Typography>
                <Typography variant="h4" component="div" sx={{ color: 'warning.main', fontWeight: 600 }}>
                  {stats.inactive_categories}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search and Table */}
      <Paper sx={{ p: 2 }}>
        <TextField
          placeholder="Search by category name or code..."
          variant="outlined"
          size="small"
          fullWidth
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2, maxWidth: 400 }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Category Code</TableCell>
                <TableCell>Category Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Products</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                      {searchText ? 'No categories found matching your search' : 'No categories yet. Click "Add Category" to create one.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id} hover>
                    <TableCell>
                      <Chip
                        label={category.code}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CategoryIcon fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight={500}>
                          {category.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                        {category.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={category.product_count || 0}
                        size="small"
                        color={category.product_count ? 'success' : 'default'}
                        icon={<InventoryIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={category.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={category.is_active ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditCategory(category)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Category Modal */}
      <Dialog
        open={addModalOpen}
        onClose={() => !saving && setAddModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Category Name"
              variant="outlined"
              fullWidth
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Electronics, Food & Beverages"
              helperText="A descriptive name for the category"
            />
            <TextField
              label="Category Code (Optional)"
              variant="outlined"
              fullWidth
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              placeholder="e.g., ELE-1234"
              helperText="Format: 3 letters + hyphen + 4 digits. Leave blank to auto-generate."
              inputProps={{ maxLength: 8 }}
            />
            <TextField
              label="Description (Optional)"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Enter category description"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddModalOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitAdd}
            variant="contained"
            disabled={saving || !formName.trim()}
          >
            {saving ? 'Creating...' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog
        open={editModalOpen}
        onClose={() => !saving && setEditModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Category Name"
              variant="outlined"
              fullWidth
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <TextField
              label="Description (Optional)"
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
            {selectedCategory && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Category Code: <strong>{selectedCategory.code}</strong> (cannot be changed)
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModalOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitEdit}
            variant="contained"
            disabled={saving || !formName.trim()}
          >
            {saving ? 'Updating...' : 'Update Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteModalOpen}
        onClose={() => !saving && setDeleteModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to delete this category?
          </Alert>
          {selectedCategory && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Category:</strong> {selectedCategory.name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Code:</strong> {selectedCategory.code}
              </Typography>
              {selectedCategory.product_count && selectedCategory.product_count > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This category has <strong>{selectedCategory.product_count}</strong> product(s).
                  It will be deactivated instead of permanently deleted.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitDelete}
            variant="contained"
            color="error"
            disabled={saving}
          >
            {saving ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

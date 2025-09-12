import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Edit, Trash2, Package, AlertTriangle, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
  category_name: string | null;
}

const Products: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    image_url: '',
    category_name: ''
  });
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const uniqueCategories = Array.from(
      new Set(products.map(product => product.category_name).filter(Boolean))
    );
    setCategories(uniqueCategories as string[]);
  }, [products]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admin_products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const productData: Partial<Product> = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        stock_quantity: parseInt(formData.stock_quantity),
        image_url: formData.image_url || null,
        category_name: formData.category_name || null
      };

      if (!currentProduct && formData.id) {
        // Check if ID already exists when creating a new product
        const { data: existingProduct } = await supabase
          .from('admin_products')
          .select('id')
          .eq('id', parseInt(formData.id))
          .single();

        if (existingProduct) {
          setError('This ID is already in use. Please choose a different ID.');
          return;
        }
        productData.id = parseInt(formData.id);
      }

      if (currentProduct) {
        const { error: updateError } = await supabase
          .from('admin_products')
          .update(productData)
          .eq('id', currentProduct.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('admin_products')
          .insert([productData]);
        
        if (insertError) throw insertError;
      }

      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      setError('Failed to save product. Please try again.');
    }
  };

  const handleDeleteProduct = async () => {
    if (!currentProduct) return;
    setError(null);
    try {
      const { error } = await supabase
        .from('admin_products')
        .delete()
        .eq('id', currentProduct.id);

      if (error) throw error;
      setShowModal(false);
      setCurrentProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product');
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      price: '',
      stock_quantity: '',
      image_url: '',
      category_name: ''
    });
    setCurrentProduct(null);
    setShowModal(false);
  };

  const openEditModal = (product: Product) => {
    setCurrentProduct(product);
    setFormData({
      id: '',
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      image_url: product.image_url || '',
      category_name: product.category_name || ''
    });
    setShowModal(true);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && product.stock_quantity < 10 && product.stock_quantity > 0) ||
      (stockFilter === 'out' && product.stock_quantity === 0);

    const matchesCategory =
      categoryFilter === 'all' ||
      (categoryFilter === 'uncategorized' && !product.category_name) ||
      product.category_name === categoryFilter;

    return matchesSearch && matchesStock && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus size={18} className="mr-2" />
          Add Product
        </button>
      </div>

      {error && (
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'}`}>
          {error}
        </div>
      )}

      <div className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center">
            <Search size={20} className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full p-2 rounded-md outline-none ${
                isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`w-full p-2 rounded-md ${
                isDarkMode ? 'bg-gray-600 text-white border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-200'
              }`}
            >
              <option value="all">All Categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Stock Status
            </label>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
              className={`w-full p-2 rounded-md ${
                isDarkMode ? 'bg-gray-600 text-white border-gray-700' : 'bg-gray-100 text-gray-900 border-gray-200'
              }`}
            >
              <option value="all">All Stock Levels</option>
              <option value="low">Low Stock (&lt;10)</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className={`rounded-lg shadow-md overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}
          >
            <div className="h-48 bg-gray-200 relative">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                  <Package size={48} className="text-gray-400" />
                </div>
              )}
              {product.stock_quantity < 10 && (
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs flex items-center ${
                  product.stock_quantity === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  <AlertTriangle size={12} className="mr-1" />
                  {product.stock_quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {product.category_name || 'Uncategorized'}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-indigo-600">₹{product.price.toFixed(2)}</span>
              </div>
              <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} line-clamp-2`}>
                {product.description || 'No description available'}
              </p>
              <div className="mt-4 flex justify-between items-center">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Stock: {product.stock_quantity}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(product)}
                    className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-gray-600"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setCurrentProduct(product);
                      setShowModal(true);
                    }}
                    className="p-2 rounded-full text-red-600 hover:bg-red-100 dark:hover:bg-gray-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
  <div className="fixed inset-0 z-10 overflow-y-auto">
    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div className="fixed inset-0 transition-opacity" aria-hidden="true">
        <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
      </div>
      <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <h3 className="text-lg leading-6 font-medium mb-4">
            {currentProduct ? 'Edit Product' : 'Add New Product'}
          </h3>
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* ID Field (only for new products) */}
              {!currentProduct && (
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    ID
                  </label>
                  <input
                    type="number"
                    name="id"
                    value={formData.id}
                    onChange={handleInputChange}
                    placeholder="ID"
                    className={`w-full p-2 border rounded-md ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              )}
              {/* Name Field (always shown) */}
              <div className={currentProduct ? 'col-span-2' : ''}>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Product Name"
                  required
                  className={`w-full p-2 border rounded-md ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
            </div>

            {/* Category Field */}
            <div>
              <input
                type="text"
                name="category_name"
                value={formData.category_name}
                onChange={handleInputChange}
                placeholder="Category"
                className={`w-full p-2 border rounded-md ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            {/* Description Field */}
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Description"
              rows={3}
              className={`w-full p-2 border rounded-md ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            />

            {/* Price and Stock Quantity Fields */}
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="Price"
                required
                min="0"
                step="0.01"
                className={`w-full p-2 border rounded-md ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
              <input
                type="number"
                name="stock_quantity"
                value={formData.stock_quantity}
                onChange={handleInputChange}
                placeholder="Stock Quantity"
                required
                min="0"
                className={`w-full p-2 border rounded-md ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            {/* Image URL Field */}
            <input
              type="url"
              name="image_url"
              value={formData.image_url}
              onChange={handleInputChange}
              placeholder="Image URL"
              className={`w-full p-2 border rounded-md ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={resetForm}
                className={`px-4 py-2 rounded-md ${
                  isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              {currentProduct && (
                <button
                  type="button"
                  onClick={handleDeleteProduct}
                  className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                >
                  Delete
                </button>
              )}
              <button
                type="submit"
                className={`px-4 py-2 rounded-md text-white ${
                  currentProduct ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {currentProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Products;
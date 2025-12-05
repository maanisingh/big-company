'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  Filter,
  MapPin,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Store,
  Star,
  Loader2,
  ChevronRight,
  Package,
  Clock
} from 'lucide-react';
import { shopApi, cartApi } from '@/lib/api';
import { useCartStore, useAuthStore } from '@/lib/store';

interface Product {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  variants: Array<{
    id: string;
    title: string;
    prices: Array<{
      amount: number;
      currency_code: string;
    }>;
    inventory_quantity: number;
  }>;
  categories?: Array<{ id: string; name: string }>;
}

interface Category {
  id: string;
  name: string;
  handle: string;
  description?: string;
  product_count?: number;
}

interface Retailer {
  id: string;
  name: string;
  location: string;
  district?: string;
  sector?: string;
  cell?: string;
  rating: number;
  distance?: number;
  is_open: boolean;
  image?: string;
  delivery_time?: string;
  minimum_order?: number;
}

interface LocationInput {
  district: string;
  sector: string;
  cell: string;
}

export default function ShopPage() {
  const { isAuthenticated } = useAuthStore();
  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCartStore();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showRetailerModal, setShowRetailerModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(true);
  const [exploreMode, setExploreMode] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationInput | null>(null);
  const [locationInput, setLocationInput] = useState<LocationInput>({
    district: '',
    sector: '',
    cell: ''
  });

  // Handle location submission
  const handleLocationSubmit = () => {
    if (locationInput.district && locationInput.sector && locationInput.cell) {
      setUserLocation(locationInput);
      setShowLocationModal(false);
      setShowRetailerModal(true);
    }
  };

  // Fetch categories and retailers on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const categoriesData = await shopApi.getCategories();
        setCategories(categoriesData.product_categories || []);

        // Fetch retailers based on location or all if in explore mode
        if (userLocation && !exploreMode) {
          const retailersData = await shopApi.getRetailers({
            ...userLocation,
            exploreMode: false
          });
          // Sort by matching location (cell > sector > district)
          const sorted = (retailersData.retailers || []).sort((a: Retailer, b: Retailer) => {
            if (a.cell === userLocation.cell) return -1;
            if (b.cell === userLocation.cell) return 1;
            if (a.sector === userLocation.sector) return -1;
            if (b.sector === userLocation.sector) return 1;
            if (a.district === userLocation.district) return -1;
            if (b.district === userLocation.district) return 1;
            return 0;
          });
          setRetailers(sorted);
        } else if (exploreMode) {
          const retailersData = await shopApi.getRetailers({ exploreMode: true });
          setRetailers(retailersData.retailers || []);
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setLoading(false);
      }
    };
    if (userLocation || exploreMode) {
      fetchInitialData();
    }
  }, [userLocation, exploreMode]);

  // Fetch products when retailer or category changes
  const fetchProducts = useCallback(async () => {
    if (!selectedRetailer) return;

    setLoadingProducts(true);
    try {
      const data = await shopApi.getProducts({
        retailerId: selectedRetailer.id,
        category: selectedCategory || undefined,
        search: searchQuery || undefined,
        limit: 50,
      });
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoadingProducts(false);
    }
  }, [selectedRetailer, selectedCategory, searchQuery]);

  useEffect(() => {
    if (selectedRetailer) {
      fetchProducts();
    }
  }, [selectedRetailer, selectedCategory, fetchProducts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedRetailer && searchQuery) {
        fetchProducts();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedRetailer, fetchProducts]);

  // Get item quantity in cart
  const getItemQuantity = (productId: string) => {
    const item = items.find((i) => i.id === productId);
    return item?.quantity || 0;
  };

  // Add to cart handler
  const handleAddToCart = (product: Product) => {
    const variant = product.variants[0];
    if (!variant) return;

    const price = variant.prices.find((p) => p.currency_code === 'rwf')?.amount ||
                  variant.prices[0]?.amount || 0;

    addItem({
      id: product.id,
      name: product.title,
      price: price,
      quantity: 1,
      image: product.thumbnail,
    });
  };

  // Cart total items count
  const cartItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Select retailer
  const handleSelectRetailer = (retailer: Retailer) => {
    if (items.length > 0 && selectedRetailer && selectedRetailer.id !== retailer.id) {
      if (!confirm('Changing retailer will clear your cart. Continue?')) {
        return;
      }
      clearCart();
    }
    setSelectedRetailer(retailer);
    setShowRetailerModal(false);
  };

  // Checkout handler
  const handleCheckout = () => {
    if (!isAuthenticated) {
      window.location.href = '/auth/login?redirect=/shop/checkout';
      return;
    }
    window.location.href = '/shop/checkout';
  };

  // Format price
  const formatPrice = (amount: number) => {
    return `${amount.toLocaleString()} RWF`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Location Selection Modal */}
      {showLocationModal && !userLocation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold mb-2">Enter Your Location</h2>
              <p className="text-sm text-gray-600">We'll show you the nearest stores based on your location</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">District *</label>
                <input
                  type="text"
                  value={locationInput.district}
                  onChange={(e) => setLocationInput({...locationInput, district: e.target.value})}
                  placeholder="Enter your district"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sector *</label>
                <input
                  type="text"
                  value={locationInput.sector}
                  onChange={(e) => setLocationInput({...locationInput, sector: e.target.value})}
                  placeholder="Enter your sector"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cell *</label>
                <input
                  type="text"
                  value={locationInput.cell}
                  onChange={(e) => setLocationInput({...locationInput, cell: e.target.value})}
                  placeholder="Enter your cell"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleLocationSubmit}
                disabled={!locationInput.district || !locationInput.sector || !locationInput.cell}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Find Nearest Stores
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retailer Selection Modal */}
      {showRetailerModal && !selectedRetailer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Select a Store</h2>
              <p className="text-sm text-gray-600">
                {exploreMode ? 'Explore all available stores' : 'Stores near your location'}
              </p>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {retailers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No retailers available in your area</p>
                </div>
              ) : (
                retailers.map((retailer) => (
                  <button
                    key={retailer.id}
                    onClick={() => handleSelectRetailer(retailer)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      retailer.is_open
                        ? 'border-gray-200 hover:border-primary-500 hover:bg-primary-50'
                        : 'border-gray-100 bg-gray-50 opacity-60'
                    }`}
                    disabled={!retailer.is_open}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        {retailer.image ? (
                          <Image
                            src={retailer.image}
                            alt={retailer.name}
                            width={64}
                            height={64}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <Store className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold truncate">{retailer.name}</h3>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              retailer.is_open
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {retailer.is_open ? 'Open' : 'Closed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{retailer.location}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm">
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Star className="w-4 h-4 fill-current" />
                            <span>{retailer.rating.toFixed(1)}</span>
                          </div>
                          {retailer.distance && (
                            <span className="text-gray-500">{retailer.distance.toFixed(1)} km</span>
                          )}
                          {retailer.delivery_time && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span>{retailer.delivery_time}</span>
                            </div>
                          )}
                        </div>
                        {retailer.minimum_order && (
                          <p className="text-xs text-gray-500 mt-1">
                            Min. order: {formatPrice(retailer.minimum_order)}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>
                ))
              )}
            </div>
            {!exploreMode && (
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setExploreMode(true);
                    setShowRetailerModal(false);
                    setShowRetailerModal(true);
                  }}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Explore Another Store
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header with Search */}
      <div className="bg-white sticky top-14 z-40 shadow-sm">
        {/* Selected Retailer Bar */}
        {selectedRetailer && (
          <div className="px-4 py-2 bg-primary-50 border-b border-primary-100">
            <button
              onClick={() => setShowRetailerModal(true)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary-600" />
                <span className="font-medium text-primary-700">{selectedRetailer.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedRetailer.is_open
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {selectedRetailer.is_open ? 'Open' : 'Closed'}
                </span>
              </div>
              <span className="text-sm text-primary-600">Change Store</span>
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 border rounded-lg transition-colors ${
                showFilters || selectedCategory
                  ? 'bg-primary-50 border-primary-500 text-primary-600'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        {showFilters && (
          <div className="px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  !selectedCategory
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Products
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="p-4">
        {!selectedRetailer ? (
          <div className="text-center py-12">
            <Store className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Select a Store</h3>
            <p className="text-gray-500 mb-4">Choose a retailer to see their products</p>
            <button
              onClick={() => setShowRetailerModal(true)}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Browse Stores
            </button>
          </div>
        ) : loadingProducts ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Products Found</h3>
            <p className="text-gray-500">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : 'This store has no products in this category'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const variant = product.variants[0];
              const price = variant?.prices.find((p) => p.currency_code === 'rwf')?.amount ||
                           variant?.prices[0]?.amount || 0;
              const quantity = getItemQuantity(product.id);
              const inStock = (variant?.inventory_quantity || 0) > 0;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="aspect-square bg-gray-100 relative">
                    {product.thumbnail ? (
                      <Image
                        src={product.thumbnail}
                        alt={product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    {!inStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{product.title}</h3>
                    <p className="text-primary-600 font-semibold">{formatPrice(price)}</p>

                    {/* Add to Cart Button */}
                    <div className="mt-2">
                      {quantity > 0 ? (
                        <div className="flex items-center justify-between bg-primary-50 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-primary-600 shadow-sm"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-semibold text-primary-700">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            disabled={!inStock}
                            className="w-8 h-8 flex items-center justify-center bg-primary-600 text-white rounded-lg disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={!inStock}
                          className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto z-40">
          <button
            onClick={() => setShowCart(true)}
            className="w-full bg-primary-600 text-white py-4 px-6 rounded-xl shadow-lg flex items-center justify-between hover:bg-primary-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-white text-primary-600 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center">
                  {cartItemsCount}
                </span>
              </div>
              <span className="font-medium">View Cart</span>
            </div>
            <span className="font-bold">{formatPrice(total())}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <div
            className="absolute inset-0"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-hidden">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Your Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Store Info */}
            {selectedRetailer && (
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Store className="w-4 h-4" />
                  <span>{selectedRetailer.name}</span>
                </div>
              </div>
            )}

            {/* Cart Items */}
            <div className="overflow-y-auto max-h-[40vh] p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                  >
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item.name}</h4>
                      <p className="text-primary-600 font-semibold">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-primary-600 text-white rounded-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{formatPrice(total())}</span>
                </div>
                {selectedRetailer?.minimum_order && total() < selectedRetailer.minimum_order && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    Minimum order is {formatPrice(selectedRetailer.minimum_order)}. Add{' '}
                    {formatPrice(selectedRetailer.minimum_order - total())} more to checkout.
                  </div>
                )}
                <button
                  onClick={handleCheckout}
                  disabled={selectedRetailer?.minimum_order ? total() < selectedRetailer.minimum_order : false}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed to Checkout
                </button>
                <button
                  onClick={() => {
                    clearCart();
                    setShowCart(false);
                  }}
                  className="w-full text-red-600 text-sm hover:underline"
                >
                  Clear Cart
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

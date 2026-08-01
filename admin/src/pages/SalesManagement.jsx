import React, { useState, useEffect } from 'react';
import inventoryManager from '../utils/inventoryManager';
import { supabase } from '../lib/supabaseClient';
//salesManagerpage
const SalesManagement = () => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedSize, setSelectedSize] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [salesHistory, setSalesHistory] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        setIsAnimating(true);
        loadProducts();
        loadSalesHistory();
        loadAlertsAndLowStock();
    }, []);

    const loadAlertsAndLowStock = async () => {
        try {
            const lowStock = await inventoryManager.getLowStockProducts();
            const activeAlerts = inventoryManager.getStockAlerts().filter(a => !a.acknowledged);
            setLowStockProducts(lowStock);
            setAlerts(activeAlerts);
        } catch (err) {
            console.error('Error loading alerts/low stock:', err);
        }
    };

    const loadProducts = async () => {
        const allProducts = await inventoryManager.getAllProducts();
        const inventory = await inventoryManager.getAllInventory();

        // Combine products with their inventory data
        const productsWithInventory = allProducts.map(product => ({
            ...product,
            inventory: inventory[product.id] || null
        })).filter(product => product.inventory && product.inventory.totalStock > 0);

        setProducts(productsWithInventory);
    };

    const loadSalesHistory = async () => {
        const { data, error } = await supabase
            .from('sales')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (data) setSalesHistory(data);
    };

    const handleSale = async () => {
        if (!selectedProduct || !selectedSize || quantity <= 0) {
            alert('Please select product, size, and quantity');
            return;
        }

        const productInventory = await inventoryManager.getProductInventory(selectedProduct);
        const sizeStock = productInventory.sizes.find(s => s.size === selectedSize);

        if (!sizeStock || sizeStock.currentStock < quantity) {
            alert(`Insufficient stock. Only ${sizeStock?.currentStock || 0} units available for size ${selectedSize}`);
            return;
        }

        // Process the sale
        const success = await inventoryManager.processSale(selectedProduct, selectedSize, quantity);

        if (success) {
            // Reset form and refresh data
            setSelectedProduct('');
            setSelectedSize('');
            setQuantity(1);
            await loadProducts();
            await loadSalesHistory();
            await loadAlertsAndLowStock();

            alert(`SALE EXECUTED: ${quantity} units of size ${selectedSize} logged in Supabase.`);
        } else {
            alert('Error processing sale. Please try again.');
        }
    };

    const handleReturn = async (saleId) => {
        const sale = salesHistory.find(s => s.id === saleId);
        if (!sale) return;

        const success = await inventoryManager.processReturn(sale.product_id, sale.size, sale.quantity);

        if (success) {
            // Remove sale from DB (or mark as returned)
            const { error } = await supabase.from('sales').delete().eq('id', saleId);

            await loadProducts();
            await loadSalesHistory();
            await loadAlertsAndLowStock();

            alert(`RETURN PROCESSED: Inventory restocked.`);
        } else {
            alert('Error processing return. Please try again.');
        }
    };

    const getAvailableSizes = () => {
        if (!selectedProduct) return [];
        const product = products.find(p => p.id === selectedProduct);
        return product?.inventory?.sizes.filter(s => s.currentStock > 0) || [];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    return (
        <div className="max-w-6xl mx-auto selection:bg-brand-orange selection:text-white pb-20">
            {/* Header */}
            <div className={`mb-12 transition-all duration-1000 transform ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <h1 className="text-3xl font-light text-brand-dark tracking-[0.2em] relative inline-block uppercase">
                    SALES <span className="font-bold text-brand-orange">MANAGEMENT</span>
                </h1>
                <div className="h-px w-24 bg-gradient-to-r from-brand-orange to-transparent mt-4"></div>
                <p className="text-brand-dark/40 text-sm mt-3 uppercase tracking-widest">Process sales and manage inventory</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sale Form */}
                <div className={`bg-white border border-black/5 p-8 rounded-3xl shadow-sm transition-all duration-1000 transform ${isAnimating ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}
                    style={{ transitionDelay: '200ms' }}>
                    <h2 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                        Process <span className="font-bold text-brand-orange">Sale</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-2 ml-1">Select Product</label>
                            <select
                                value={selectedProduct}
                                onChange={(e) => {
                                    setSelectedProduct(e.target.value);
                                    setSelectedSize('');
                                }}
                                className="w-full px-5 py-3.5 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-brand-orange/50 text-brand-dark transition-all shadow-sm"
                            >
                                <option value="">Choose a product...</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} - {product.inventory.totalStock} units total
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-2 ml-1">Select Size</label>
                            <select
                                value={selectedSize}
                                onChange={(e) => setSelectedSize(e.target.value)}
                                disabled={!selectedProduct}
                                className="w-full px-5 py-3.5 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-brand-orange/50 text-brand-dark transition-all disabled:opacity-50 shadow-sm"
                            >
                                <option value="">Choose size...</option>
                                {getAvailableSizes().map(size => (
                                    <option key={size.size} value={size.size}>
                                        {size.size} - {size.currentStock} units available
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-2 ml-1">Quantity</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                min="1"
                                max={getAvailableSizes().find(s => s.size === selectedSize)?.currentStock || 1}
                                className="w-full px-5 py-3.5 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-brand-orange/50 text-brand-dark transition-all shadow-sm"
                            />
                        </div>

                        <button
                            onClick={handleSale}
                            disabled={!selectedProduct || !selectedSize || quantity <= 0}
                            className="w-full py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-sm hover:bg-brand-dark hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md"
                        >
                            Process Sale
                        </button>
                    </div>
                </div>

                {/* Recent Sales */}
                <div className={`bg-white border border-black/5 p-8 rounded-3xl shadow-sm transition-all duration-1000 transform ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}
                    style={{ transitionDelay: '400ms' }}>
                    <h2 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                        Recent <span className="font-bold text-brand-orange">Sales</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                    </h2>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {salesHistory.length === 0 ? (
                            <p className="text-brand-dark/40 text-center py-8 uppercase tracking-widest text-xs">No sales recorded yet</p>
                        ) : (
                            salesHistory.map(sale => (
                                <div key={sale.id} className="p-4 bg-gray-50/50 border border-black/5 rounded-2xl group transition-all hover:bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-semibold text-brand-dark uppercase tracking-wider">{sale.product_name}</div>
                                            <div className="text-xs text-brand-dark/50 mt-1 uppercase tracking-wide">
                                                Size: {sale.size} | Qty: {sale.quantity}
                                            </div>
                                            <div className="text-[10px] text-brand-dark/30 mt-1 uppercase">
                                                {formatDate(sale.created_at)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-brand-dark text-lg">
                                                ₹{sale.total ? sale.total.toLocaleString() : '0.00'}
                                            </div>
                                            <button
                                                onClick={() => handleReturn(sale.id)}
                                                className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors mt-2 block uppercase tracking-wider"
                                            >
                                                Return
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Stock Alerts */}
            <div className={`mt-8 bg-white border border-black/5 p-8 rounded-3xl shadow-sm transition-all duration-1000 transform ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                style={{ transitionDelay: '600ms' }}>
                <h2 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                    Stock <span className="font-bold text-brand-orange">Alerts</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
                        <div className="text-red-600 font-bold text-xs uppercase tracking-[0.1em] mb-3">Low Stock Items</div>
                        {lowStockProducts.length === 0 ? (
                            <p className="text-xs uppercase tracking-widest text-brand-dark/40">No low stock items</p>
                        ) : (
                            <div className="space-y-1">
                                {lowStockProducts.slice(0, 3).map(product => (
                                    <div key={product.productId} className="text-xs text-brand-dark/70 font-medium">
                                        {product.productName}: {product.lowStockSizes.map(s => `${s.size} (${s.currentStock})`).join(', ')}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-5 bg-yellow-50 border border-yellow-100 rounded-2xl">
                        <div className="text-yellow-700 font-bold text-xs uppercase tracking-[0.1em] mb-3">Pending Alerts</div>
                        {alerts.length === 0 ? (
                            <p className="text-xs uppercase tracking-widest text-brand-dark/40">No pending alerts</p>
                        ) : (
                            <div className="space-y-1">
                                {alerts.slice(0, 3).map(alert => (
                                    <div key={alert.id} className="text-xs text-brand-dark/70 font-medium">
                                        {alert.message}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesManagement;

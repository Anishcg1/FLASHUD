import { supabase } from '../lib/supabaseClient';

// Inventory Management System
class InventoryManager {
    constructor() {
        // No manual initialization needed for Supabase
    }

    // Add new product with inventory
    async addProduct(productData) {
        const { data, error } = await supabase
            .from('products')
            .insert([{
                name: productData.productName,
                description: productData.description,
                original_price: parseFloat(productData.actualPrice),
                discounted_price: parseFloat(productData.discountedPrice),
                category_id: productData.category_id,
                stock: productData.sizes.reduce((acc, s) => {
                    acc[s.size] = parseInt(s.stock) || 0;
                    return acc;
                }, {}),
                images: productData.images
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Get all products
    async getAllProducts() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .neq('name', '_HERO_IMAGE_')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    // Get all inventory stats (used for Dashboard and Alerts)
    async getAllInventory() {
        const { data, error } = await supabase
            .from('products')
            .select('id, name, stock, original_price, discounted_price')
            .neq('name', '_HERO_IMAGE_');

        if (error) throw error;

        // Transform into the format expected by the frontend
        const inventory = {};
        data.forEach(p => {
            const stockObj = p.stock || {};
            const totalStock = Object.values(stockObj).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
            inventory[p.id] = {
                productId: p.id,
                productName: p.name,
                sizes: Object.entries(stockObj).map(([size, currentStock]) => ({
                    size,
                    currentStock
                })),
                totalStock,
                lastUpdated: new Date().toISOString()
            };
        });
        return inventory;
    }

    // Get product by ID
    async getProduct(productId) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;
        return data;
    }

    // Get inventory for specific product
    async getProductInventory(productId) {
        const product = await this.getProduct(productId);
        if (!product) return null;

        const stockObj = product.stock || {};
        const totalStock = Object.values(stockObj).reduce((sum, val) => sum + (parseInt(val) || 0), 0);

        return {
            productId: product.id,
            productName: product.name,
            sizes: Object.entries(stockObj).map(([size, currentStock]) => ({
                size,
                currentStock
            })),
            totalStock
        };
    }

    // Update stock for specific size
    async updateStock(productId, size, quantityChange) {
        const product = await this.getProduct(productId);
        if (!product) return false;

        const newStock = { ...product.stock };
        const currentStock = parseInt(newStock[size]) || 0;
        const updatedStock = currentStock + quantityChange;

        if (updatedStock < 0) return false;

        newStock[size] = updatedStock;

        const { error } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', productId);

        if (error) throw error;

        // Check for low stock alerts
        this.checkLowStock(product, size, updatedStock);

        // Record sale if it was a deduction (simplified)
        if (quantityChange < 0) {
            await supabase.from('sales').insert([{
                product_id: productId,
                product_name: product.name,
                size: size,
                quantity: Math.abs(quantityChange),
                price: product.discounted_price,
                total: Math.abs(quantityChange) * product.discounted_price
            }]);
        }

        return true;
    }

    // Process sale (deduct stock)
    async processSale(productId, size, quantity = 1) {
        return this.updateStock(productId, size, -quantity);
    }

    // Process return (add stock back)
    async processReturn(productId, size, quantity = 1) {
        return this.updateStock(productId, size, quantity);
    }

    // Check for low stock and create alerts
    checkLowStock(product, size, currentStock) {
        const LOW_STOCK_THRESHOLD = 5;
        const alerts = JSON.parse(localStorage.getItem('stockAlerts') || '[]');
        
        if (currentStock <= LOW_STOCK_THRESHOLD && currentStock > 0) {
            const alert = {
                id: Date.now().toString(),
                productId: product.id,
                productName: product.name,
                size,
                currentStock,
                threshold: LOW_STOCK_THRESHOLD,
                type: 'low_stock',
                message: `Low stock alert: ${product.name} (Size ${size}) - ${currentStock} units remaining`,
                createdAt: new Date().toISOString(),
                acknowledged: false
            };

            const existingAlert = alerts.find(a => 
                a.productId === product.id && 
                a.size === size && 
                a.type === 'low_stock' && 
                !a.acknowledged
            );

            if (!existingAlert) {
                alerts.push(alert);
                localStorage.setItem('stockAlerts', JSON.stringify(alerts));
            }
        }

        // Out of stock alert
        if (currentStock === 0) {
            const alert = {
                id: Date.now().toString(),
                productId: product.id,
                productName: product.name,
                size,
                currentStock: 0,
                type: 'out_of_stock',
                message: `Out of stock: ${product.name} (Size ${size})`,
                createdAt: new Date().toISOString(),
                acknowledged: false
            };

            const existingAlert = alerts.find(a => 
                a.productId === product.id && 
                a.size === size && 
                a.type === 'out_of_stock' && 
                !a.acknowledged
            );

            if (!existingAlert) {
                alerts.push(alert);
                localStorage.setItem('stockAlerts', JSON.stringify(alerts));
            }
        }
    }

    // Get stock alerts
    getStockAlerts() {
        return JSON.parse(localStorage.getItem('stockAlerts') || '[]');
    }

    // Acknowledge alert
    acknowledgeAlert(alertId) {
        const alerts = this.getStockAlerts();
        const alert = alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            localStorage.setItem('stockAlerts', JSON.stringify(alerts));
            return true;
        }
        return false;
    }

    // Get low stock alerts (Threshold: 5)
    async getLowStockProducts() {
        const inventory = await this.getAllInventory();
        const lowStockProducts = [];

        Object.values(inventory).forEach(productInventory => {
            const lowStockSizes = productInventory.sizes.filter(size => size.currentStock <= 5);
            if (lowStockSizes.length > 0) {
                lowStockProducts.push({
                    productId: productInventory.productId,
                    productName: productInventory.productName,
                    lowStockSizes: lowStockSizes,
                    totalStock: productInventory.totalStock
                });
            }
        });

        return lowStockProducts;
    }

    // Get inventory statistics
    async getInventoryStats() {
        const { data: products, error } = await supabase
            .from('products')
            .select('stock, original_price, discounted_price')
            .neq('name', '_HERO_IMAGE_');

        if (error) throw error;

        let totalProducts = products.length;
        let totalStockItems = 0;
        let lowStockCount = 0;
        let totalValue = 0;

        products.forEach(p => {
            const stock = p.stock || {};
            const items = Object.values(stock).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
            totalStockItems += items;

            if (Object.values(stock).some(v => parseInt(v) <= 5)) lowStockCount++;

            totalValue += items * (parseFloat(p.discounted_price) || 0);
        });

        return {
            totalProducts,
            totalValue,
            lowStockCount,
            totalStockItems
        };
    }

    // Delete product
    async deleteProduct(productId) {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) throw error;
        return true;
    }
}

// Create singleton instance
const inventoryManager = new InventoryManager();

export default inventoryManager;

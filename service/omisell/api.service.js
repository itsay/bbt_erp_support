function OmisellApiService() {
    const SELF = {
        config: {
            accessToken: null,
            refreshToken: null,
            apiKey: process.env.OMISELL_API_KEY,
            apiSecret: process.env.OMISELL_API_SECRET,
            baseUrl: process.env.OMISELL_API_BASE_URL
        },
        getToken: async () => {
            try {
                const response = await fetch(`${SELF.config.baseUrl}/api/v1/auth/token/get/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: SELF.config.apiKey,
                        api_secret: SELF.config.apiSecret
                    })
                });
                if (!response.ok) throw new Error(`Token request failed: ${response.status}`);
                const data = await response.json();
                if (data && data.data) {
                    SELF.config.accessToken = data.data.token;
                    SELF.config.refreshToken = data.data.refresh_token;
                }
                return data;
            } catch (error) {
                console.error('Token request failed:', error.message);
                throw error;
            }
        },
        refreshAccessToken: async () => {
            if (!SELF.config.refreshToken) throw new Error('No refresh token');
            try {
                const response = await fetch(`${SELF.config.baseUrl}/api/v1/auth/token/refresh/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        refresh: SELF.config.refreshToken
                    })
                });
                if (!response.ok) throw new Error(`Refresh token request failed: ${response.status}`);
                const data = await response.json();
                if (data && data.data) {
                    SELF.config.accessToken = data.data.token || SELF.config.accessToken;
                    SELF.config.refreshToken = data.data.refresh_token || SELF.config.refreshToken;
                }
                return data;
            } catch (error) {
                console.error('Refresh token request failed:', error.message);
                throw error;
            }
        },
        requestOmiWithAuth: async (endpoint, options = {}) => {
            if (!SELF.config.accessToken) await SELF.getToken();
            const headers = {
                ...options.headers,
                Authorization: `Omi ${SELF.config.accessToken}`,
                'Content-Type': 'application/json'
            };
            const response = await fetch(endpoint, { ...options, headers });
            if (response.status === 401 || response.status === 403) {
                await SELF.refreshAccessToken();
                const retryHeaders = {
                    ...options.headers,
                    Authorization: `Omi ${SELF.config.accessToken}`,
                    'Content-Type': 'application/json'
                };
                const retryResponse = await fetch(endpoint, { ...options, headers: retryHeaders });
                if (!retryResponse.ok) throw new Error(`Request failed: ${retryResponse.status}`);
                return await retryResponse.json();
            }
            if (!response.ok) throw new Error(`Request failed: ${response.status}`);
            return await response.json();
        },
        buildQuery: (params = {}) => {
            const qp = new URLSearchParams();
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') qp.append(k, String(v));
            });
            return qp.toString();
        }
    };

    return {
        getToken: SELF.getToken,
        requestOmiWithAuth: SELF.requestOmiWithAuth,
        /**
         * Get orders
         * @param {Object} params - Query parameters (https://developers.omisell.com/api-5173039)
         * @returns {Promise<Array>} Array of orders
         */
        getOrders: async (params = {}) => {
            try {
                const base = `${SELF.config.baseUrl}/api/v2/public/order/list`;
                const qs = SELF.buildQuery(params);
                const url = qs ? `${base}?${qs}` : base;
                console.log('url', url)
                return await SELF.requestOmiWithAuth(url, { method: 'GET' });
            } catch (error) {
                console.error('Get orders failed:', error.message);
            }
        },
        /**
         * Get order detail by omisell order number
         * @param {string} omisellOrderNumber - Omisell order number
         * @returns {Promise<Object>} Order detail
         */
        getOrderDetail: async (omisellOrderNumber) => {
            try {
                const url = `${SELF.config.baseUrl}/api/v2/public/order/${encodeURIComponent(omisellOrderNumber)}`;
                return await SELF.requestOmiWithAuth(url, { method: 'GET', redirect: 'follow' });
            } catch (error) {
                console.error('Get order detail failed:', error.message);
            }
        },
        /**
         * 
         * @param {Object} params 
         * - page_size
         * - page
         * - completed_from
         * - completed_to
         * @param {Object} extraHeaders 
         * @returns 
         */
        getOrderRevenue: async (params = {}, extraHeaders = {}) => {
            const base = `${SELF.config.baseUrl}/api/v2/public/finance/order-revenue`;
            const headers = {};
            if (extraHeaders && typeof extraHeaders === 'object') {
                if (extraHeaders['Seller-ID']) headers['Seller-ID'] = extraHeaders['Seller-ID'];
                if (extraHeaders['Country']) headers['Country'] = extraHeaders['Country'];
            }
            const qs = SELF.buildQuery(params);
            const url = qs ? `${base}?${qs}` : base;
            return await SELF.requestOmiWithAuth(url, { method: 'GET', headers });
        },
        /**
         * Get pickup list
         * @param {Object} params - page_size, page
         * @param {Object} extraHeaders - Seller-ID, Country
         * @returns {Promise<Array>} Array of pickup addresses
         */
        getPickup: async (params = {}, extraHeaders = {}) => {
            const base = `${SELF.config.baseUrl}/api/v2/public/pickup/list`;
            const headers = {};
            if (extraHeaders && typeof extraHeaders === 'object') {
                if (extraHeaders['Seller-ID']) headers['Seller-ID'] = extraHeaders['Seller-ID'];
                if (extraHeaders['Country']) headers['Country'] = extraHeaders['Country'];
            }
            const qs = SELF.buildQuery(params);
            const url = qs ? `${base}?${qs}` : base;
            return await SELF.requestOmiWithAuth(url, { method: 'GET', headers });
        }
    }
}

module.exports = OmisellApiService();

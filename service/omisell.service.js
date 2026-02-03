const axios = require("axios");


function OmiSellService() {
    const SELF = {
        config: {
            accessToken: null,
            refreshToken: null,
            apiKey: process.env.OMISELL_API_KEY,
            apiSecret: process.env.OMISELL_API_SECRET
        },
        getToken: async () => {
            try {
                const response = await axios.post('https://api.omisell.com/api/v1/auth/token/get/', {
                    api_key: SELF.config.apiKey,
                    api_secret: SELF.config.apiSecret
                });
                const data = response.data;
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
                const response = await axios.post('https://api.omisell.com/api/v1/auth/token/refresh/', {
                    refresh: SELF.config.refreshToken
                });
                const data = response.data;
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
            try {
                return await axios({
                    url: endpoint,
                    ...options,
                    headers
                });
            } catch (error) {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    await SELF.refreshAccessToken();
                    const retryHeaders = {
                        ...options.headers,
                        Authorization: `Omi ${SELF.config.accessToken}`,
                        'Content-Type': 'application/json'
                    };
                    return await axios({
                        url: endpoint,
                        ...options,
                        headers: retryHeaders
                    });
                }
                throw error;
            }
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
         * @param {Object} params - Query parameters
         * @returns {Promise<Array>} Array of orders
         */
        getOrders: async (params = {}) => {
            try {
                const base = 'https://api.omisell.com/api/v2/public/order/list';
                const qs = SELF.buildQuery(params);
                const url = qs ? `${base}?${qs}` : base;
                const res = await SELF.requestOmiWithAuth(url, { method: 'GET' });
                return res.data.data.results;
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
                const url = `https://api.omisell.com/api/v2/public/order/${encodeURIComponent(omisellOrderNumber)}`;
                const res = await SELF.requestOmiWithAuth(url, { method: 'GET', redirect: 'follow' });
                return res.data
            } catch (error) {
                console.error('Get order detail failed:', error.message);
            }
        }
    };
}

module.exports = OmiSellService();

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class PinataService {
  constructor() {
    this.apiKey = process.env.PINATA_API_KEY;
    this.secretKey = process.env.PINATA_SECRET_KEY;
    this.baseUrl = 'https://api.pinata.cloud';
    this.gatewayUrl = 'https://gateway.pinata.cloud/ipfs';

    if (!this.apiKey || !this.secretKey) {
      console.warn('⚠️ Pinata credentials not found in environment variables');
    }
  }

  /**
   * Test Pinata connection
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/data/testAuthentication`, {
        headers: {
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.secretKey
        }
      });
      console.log('✅ Pinata connection successful:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Pinata connection failed:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Upload file buffer to Pinata IPFS
   * @param {Buffer} fileBuffer - File buffer to upload
   * @param {string} fileName - Original file name
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} - Upload result with CID
   */
  async uploadFile(fileBuffer, fileName, metadata = {}) {
    try {
      // Validate file size (max 1MB)
      const fileSizeInMB = fileBuffer.length / (1024 * 1024);
      if (fileSizeInMB > 1) {
        throw new Error(`File size (${fileSizeInMB.toFixed(2)}MB) exceeds 1MB limit`);
      }

      // Validate file type
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
      const fileExtension = path.extname(fileName).toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error(`File type ${fileExtension} not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
      }

      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: this.getContentType(fileExtension)
      });

      // Add metadata
      const pinataMetadata = {
        name: fileName,
        keyvalues: {
          uploadedAt: new Date().toISOString(),
          fileType: fileExtension,
          ...metadata
        }
      };

      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

      // Pin options
      const pinataOptions = {
        cidVersion: 1
      };
      formData.append('pinataOptions', JSON.stringify(pinataOptions));

      console.log(`📤 Uploading file to Pinata: ${fileName} (${fileSizeInMB.toFixed(2)}MB)`);

      const response = await axios.post(
        `${this.baseUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
            pinata_api_key: this.apiKey,
            pinata_secret_api_key: this.secretKey
          }
        }
      );

      console.log('✅ File uploaded to IPFS:', response.data.IpfsHash);

      return {
        success: true,
        cid: response.data.IpfsHash,
        size: response.data.PinSize,
        timestamp: response.data.Timestamp,
        url: `${this.gatewayUrl}/${response.data.IpfsHash}`,
        fileName: fileName,
        fileType: fileExtension
      };
    } catch (error) {
      console.error('❌ Pinata upload error:', error.response?.data || error.message);
      throw new Error(`Failed to upload to IPFS: ${error.message}`);
    }
  }

  /**
   * Upload JSON data to Pinata IPFS
   * @param {Object} jsonData - JSON object to upload
   * @param {string} name - Name for the JSON file
   * @returns {Promise<Object>} - Upload result with CID
   */
  async uploadJSON(jsonData, name = 'medical-record') {
    try {
      const body = {
        pinataContent: jsonData,
        pinataMetadata: {
          name: `${name}.json`,
          keyvalues: {
            uploadedAt: new Date().toISOString(),
            type: 'json'
          }
        },
        pinataOptions: {
          cidVersion: 1
        }
      };

      console.log(`📤 Uploading JSON to Pinata: ${name}`);

      const response = await axios.post(
        `${this.baseUrl}/pinning/pinJSONToIPFS`,
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            pinata_api_key: this.apiKey,
            pinata_secret_api_key: this.secretKey
          }
        }
      );

      console.log('✅ JSON uploaded to IPFS:', response.data.IpfsHash);

      return {
        success: true,
        cid: response.data.IpfsHash,
        size: response.data.PinSize,
        timestamp: response.data.Timestamp,
        url: `${this.gatewayUrl}/${response.data.IpfsHash}`
      };
    } catch (error) {
      console.error('❌ Pinata JSON upload error:', error.response?.data || error.message);
      throw new Error(`Failed to upload JSON to IPFS: ${error.message}`);
    }
  }

  /**
   * Retrieve file from IPFS
   * @param {string} cid - IPFS CID
   * @returns {Promise<Buffer>} - File buffer
   */
  async retrieveFile(cid) {
    // List of IPFS gateways to try (in order of preference)
    const gateways = [
      'https://gateway.pinata.cloud/ipfs',
      'https://ipfs.io/ipfs',
      'https://cloudflare-ipfs.com/ipfs',
      'https://dweb.link/ipfs'
    ];

    for (let i = 0; i < gateways.length; i++) {
      const gateway = gateways[i];
      try {
        console.log(`📥 Attempting to retrieve file from IPFS gateway ${i + 1}/${gateways.length}: ${gateway}`);

        const response = await axios.get(`${gateway}/${cid}`, {
          responseType: 'arraybuffer',
          timeout: 15000, // Reduced timeout for faster failover
          headers: {
            'User-Agent': 'HealthLedger/1.0'
          }
        });

        console.log(`✅ File retrieved successfully from gateway: ${gateway}`);
        return Buffer.from(response.data);

      } catch (error) {
        console.error(`❌ Gateway ${gateway} failed:`, error.response?.status || error.message);

        // If this is a rate limit error (429) and we have more gateways, try the next one
        if (error.response?.status === 429 && i < gateways.length - 1) {
          console.log(`⏳ Rate limited on ${gateway}, trying next gateway...`);
          continue;
        }

        // If this is the last gateway, throw the error
        if (i === gateways.length - 1) {
          throw new Error(`Failed to retrieve from IPFS after trying ${gateways.length} gateways. Last error: ${error.message}`);
        }
      }
    }
  }

  /**
   * Retrieve JSON data from IPFS
   * @param {string} cid - IPFS CID
   * @returns {Promise<Object>} - JSON data
   */
  async retrieveJSON(cid) {
    try {
      console.log(`📥 Retrieving JSON from IPFS: ${cid}`);

      const response = await axios.get(`${this.gatewayUrl}/${cid}`, {
        timeout: 30000
      });

      console.log('✅ JSON retrieved from IPFS');
      return response.data;
    } catch (error) {
      console.error('❌ IPFS JSON retrieval error:', error.message);
      throw new Error(`Failed to retrieve JSON from IPFS: ${error.message}`);
    }
  }

  /**
   * Alias for retrieveJSON to maintain compatibility with Federated Learning bridge
   */
  async getFromIPFS(cid) {
    return this.retrieveJSON(cid);
  }


  /**
   * Unpin file from Pinata
   * @param {string} cid - IPFS CID to unpin
   */
  async unpinFile(cid) {
    try {
      await axios.delete(`${this.baseUrl}/pinning/unpin/${cid}`, {
        headers: {
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.secretKey
        }
      });
      console.log(`✅ File unpinned from Pinata: ${cid}`);
      return true;
    } catch (error) {
      console.error('❌ Unpin error:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Get content type based on file extension
   * @param {string} extension - File extension
   * @returns {string} - MIME type
   */
  getContentType(extension) {
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };
    return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * List all pinned files (for admin/debugging)
   * @param {number} limit - Number of results to return
   */
  async listPinnedFiles(limit = 10) {
    try {
      const response = await axios.get(`${this.baseUrl}/data/pinList`, {
        params: {
          status: 'pinned',
          pageLimit: limit
        },
        headers: {
          pinata_api_key: this.apiKey,
          pinata_secret_api_key: this.secretKey
        }
      });

      return response.data.rows;
    } catch (error) {
      console.error('❌ List pinned files error:', error.response?.data || error.message);
      throw new Error(`Failed to list pinned files: ${error.message}`);
    }
  }

  /**
   * Get public gateway URL for a CID
   * @param {string} cid - IPFS CID
   * @returns {string} - Public gateway URL
   */
  getFileUrl(cid) {
    // Return the most reliable gateway URL
    return `https://ipfs.io/ipfs/${cid}`;
  }

  /**
   * Get multiple gateway URLs for a CID
   * @param {string} cid - IPFS CID
   * @returns {Array} - Array of gateway URLs
   */
  getGatewayUrls(cid) {
    return [
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://dweb.link/ipfs/${cid}`,
      `${this.gatewayUrl}/${cid}`
    ];
  }
}

module.exports = new PinataService();

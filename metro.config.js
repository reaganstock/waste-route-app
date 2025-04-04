const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add video files extensions to assetExts
config.resolver.assetExts.push(
  'mp4',
  'mp3', 
  'mov',
  'wav',
  'webm'
);

module.exports = config; 
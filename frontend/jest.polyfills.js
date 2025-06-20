// Polyfills for Jest environment

// TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Fetch API
global.fetch = require('jest-fetch-mock')

// URLSearchParams
const { URLSearchParams } = require('url')
global.URLSearchParams = URLSearchParams

// URL
const { URL } = require('url')
global.URL = URL
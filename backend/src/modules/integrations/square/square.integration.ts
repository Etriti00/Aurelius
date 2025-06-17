import {
  BaseIntegration,
  AuthResult,
  IntegrationCapability,
  SyncResult,
  WebhookPayload,
  ConnectionStatus,
  IntegrationConfig
} from '../base/integration.interface'
import {
  ApiResponse,
  WebhookEvent,
  GenericWebhookPayload
} from '../../../common/types/integration-types'
import { AuthenticationError, SyncError } from '../common/integration.error'
import * as crypto from 'crypto'

interface SquareWebhookPayload extends WebhookPayload {
  id: string,
  type: string
  data: Record<string, unknown>
  createdAt: Date
  metadata?: Record<string, unknown>
}

interface SquareTokenResponse {
  access_token: string
  refresh_token?: string
  expires_at?: string
  merchant_id?: string
  plan_id?: string
  token_type: string,
  short_lived: boolean
}

interface SquareMerchant {
  id: string,
  business_name: string
  country: string,
  language_code: string
  currency: string,
  status: 'ACTIVE' | 'INACTIVE'
  main_location_id: string
}

interface SquareLocation {
  id: string,
  name: string
  address: SquareAddress,
  timezone: string
  capabilities: ('CREDIT_CARD_PROCESSING' | 'AUTOMATIC_TRANSFERS' | 'INSTANT_DEPOSITS')[],
  status: 'ACTIVE' | 'INACTIVE'
  created_at: string,
  merchant_id: string
  country: string,
  language_code: string
  currency: string,
  phone_number: string
  business_name: string,
  type: 'PHYSICAL' | 'MOBILE'
  website_url: string,
  business_hours: SquareBusinessHours
  business_email: string,
  description: string
  twitter_username: string,
  instagram_username: string
  facebook_url: string,
  coordinates: SquareCoordinates
  logo_url: string,
  pos_background_url: string
  mcc: string,
  full_format_logo_url: string
  tax_ids: SquareTaxIds
}

interface SquareAddress {
  address_line_1: string,
  address_line_2: string
  address_line_3: string,
  locality: string
  sublocality: string,
  sublocality_2: string
  sublocality_3: string,
  administrative_district_level_1: string
  administrative_district_level_2: string,
  administrative_district_level_3: string
  postal_code: string,
  country: string
  first_name: string,
  last_name: string
  organization: string
}

interface SquareBusinessHours {
  periods: Array<{,
    day_of_week: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
    start_local_time: string,
    end_local_time: string
  }>
}

interface SquareCoordinates {
  latitude: number,
  longitude: number
}

interface SquareTaxIds {
  eu_vat: string,
  fr_siret: string
  fr_naf: string,
  es_nif: string
  uk_vat: string
}

interface SquarePayment {
  id: string,
  created_at: string
  updated_at: string,
  amount_money: SquareMoney
  tip_money: SquareMoney,
  total_money: SquareMoney
  app_fee_money: SquareMoney,
  approved_money: SquareMoney
  processing_fee: SquareProcessingFee[],
  refunded_money: SquareMoney
  status: 'APPROVED' | 'PENDING' | 'COMPLETED' | 'CANCELED' | 'FAILED',
  delay_duration: string
  delay_action: 'CANCEL' | 'COMPLETE',
  delayed_until: string
  source_type: 'CARD' | 'BANK_ACCOUNT' | 'WALLET' | 'BUY_NOW_PAY_LATER' | 'CASH' | 'EXTERNAL',
  card_details: SquareCardDetails
  cash_details: SquareCashDetails,
  bank_account_details: SquareBankAccountDetails
  external_details: SquareExternalDetails,
  wallet_details: SquareWalletDetails
  buy_now_pay_later_details: SquareBuyNowPayLaterDetails,
  location_id: string
  order_id: string,
  reference_id: string
  customer_id: string,
  employee_id: string
  team_member_id: string,
  refund_ids: string[]
  risk_evaluation: SquareRiskEvaluation,
  buyer_email_address: string
  billing_address: SquareAddress,
  shipping_address: SquareAddress
  note: string,
  statement_description_identifier: string
  capabilities: string[],
  receipt_number: string
  receipt_url: string,
  device_details: SquareDeviceDetails
  application_details: SquareApplicationDetails,
  version_token: string
}

interface SquareMoney {
  amount: number,
  currency: string
}

interface SquareProcessingFee {
  effective_at: string,
  type: string
  amount_money: SquareMoney
}

interface SquareCardDetails {
  status: 'AUTHORIZED' | 'CAPTURED' | 'VOIDED' | 'FAILED',
  card: SquareCard
  entry_method: 'KEYED' | 'SWIPED' | 'EMV' | 'ON_FILE' | 'CONTACTLESS',
  cvv_status: 'CVV_ACCEPTED' | 'CVV_REJECTED' | 'CVV_NOT_CHECKED'
  avs_status: 'AVS_ACCEPTED' | 'AVS_REJECTED' | 'AVS_NOT_CHECKED',
  statement_description: string
  card_payment_timeline: SquareCardPaymentTimeline,
  refund_requires_card_presence: boolean
  errors: SquareError[]
}

interface SquareCard {
  id: string,
  card_brand:
    | 'VISA'
    | 'MASTERCARD'
    | 'AMERICAN_EXPRESS'
    | 'DISCOVER'
    | 'DISCOVER_DINERS'
    | 'JCB'
    | 'CHINA_UNIONPAY'
    | 'SQUARE_GIFT_CARD'
    | 'SQUARE_CAPITAL_CARD'
    | 'OTHER_BRAND'
  last_4: string,
  exp_month: number
  exp_year: number,
  cardholder_name: string
  billing_address: SquareAddress,
  fingerprint: string
  customer_id: string,
  merchant_id: string
  reference_id: string,
  enabled: boolean
  card_type: 'CREDIT' | 'DEBIT' | 'UNKNOWN_CARD_TYPE',
  prepaid_type: 'PREPAID' | 'NOT_PREPAID' | 'UNKNOWN_PREPAID_TYPE'
  bin: string,
  version: number
  card_co_brand: string
}

interface SquareCardPaymentTimeline {
  authorized_at: string,
  captured_at: string
  voided_at: string
}

interface SquareError {
  category:
    | 'API_ERROR'
    | 'AUTHENTICATION_ERROR'
    | 'INVALID_REQUEST_ERROR'
    | 'RATE_LIMIT_ERROR'
    | 'PAYMENT_METHOD_ERROR'
    | 'REFUND_ERROR'
    | 'MERCHANT_SUBSCRIPTION_ERROR'
  code: string,
  detail: string
  field: string
}

interface SquareCashDetails {
  buyer_tendered_money: SquareMoney,
  change_back_money: SquareMoney
}

interface SquareBankAccountDetails {
  bank_name: string,
  transfer_type: 'ACH'
  account_ownership_type: 'INDIVIDUAL' | 'COMPANY' | 'ACCOUNT_TYPE_UNKNOWN',
  fingerprint: string
  country: string,
  statement_description: string
  ach_details: SquareACHDetails
}

interface SquareACHDetails {
  routing_number: string,
  account_number_suffix: string
  account_type: 'CHECKING' | 'SAVINGS' | 'UNKNOWN'
}

interface SquareExternalDetails {
  type:
    | 'CHECK'
    | 'BANK_TRANSFER'
    | 'OTHER_GIFT_CARD'
    | 'CRYPTO'
    | 'SQUARE_CASH'
    | 'SOCIAL'
    | 'EXTERNAL'
    | 'EMONEY'
    | 'CARD'
    | 'STORED_BALANCE'
    | 'FOOD_VOUCHER'
    | 'VOUCHER'
  source: string,
  source_id: string
  source_fee_money: SquareMoney
}

interface SquareWalletDetails {
  status: 'AUTHORIZED' | 'CAPTURED' | 'VOIDED' | 'FAILED',
  brand: 'CASH_APP' | 'PAYPAY' | 'UNKNOWN'
  cash_app_details: SquareCashAppDetails
}

interface SquareCashAppDetails {
  buyer_full_name: string,
  buyer_country_code: string
  buyer_cashtag: string
}

interface SquareBuyNowPayLaterDetails {
  brand: 'SEZZLE' | 'AFTERPAY' | 'CLEARPAY' | 'UNKNOWN',
  afterpay_details: SquareAfterpayDetails
  sezzle_details: SquareSezzleDetails,
  clearpay_details: SquareClearpayDetails
}

interface SquareAfterpayDetails {
  email_address: string
}

interface SquareSezzleDetails {
  email_address: string
}

interface SquareClearpayDetails {
  email_address: string
}

interface SquareRiskEvaluation {
  created_at: string,
  risk_level: 'PENDING' | 'NORMAL' | 'MODERATE' | 'HIGH'
}

interface SquareDeviceDetails {
  device_id: string,
  device_installation_id: string
  device_name: string
}

interface SquareApplicationDetails {
  square_product:
    | 'SQUARE_POS'
    | 'EXTERNAL_API'
    | 'BILLING'
    | 'APPOINTMENTS'
    | 'INVOICES'
    | 'ONLINE_STORE'
    | 'PAYROLL'
    | 'DASHBOARD'
    | 'ITEM_LIBRARY_IMPORT'
    | 'OTHER'
  application_id: string
}

interface SquareRefund {
  id: string,
  location_id: string
  transaction_id: string,
  tender_id: string
  created_at: string,
  reason: string
  amount_money: SquareMoney,
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED'
  processing_fee_money: SquareMoney,
  additional_recipients: SquareAdditionalRecipient[]
}

interface SquareAdditionalRecipient {
  location_id: string,
  description: string
  amount_money: SquareMoney,
  receivable_id: string
}

interface SquareOrder {
  id: string,
  location_id: string
  reference_id: string,
  source: SquareOrderSource
  customer_id: string,
  line_items: SquareOrderLineItem[]
  taxes: SquareOrderTax[],
  discounts: SquareOrderDiscount[]
  service_charges: SquareOrderServiceCharge[],
  fulfillments: SquareOrderFulfillment[]
  returns: SquareOrderReturn[],
  return_amounts: SquareOrderMoneyAmounts
  net_amounts: SquareOrderMoneyAmounts,
  rounding_adjustment: SquareOrderRoundingAdjustment
  tenders: SquareOrderTender[],
  refunds: SquareOrderRefund[]
  metadata: { [key: string]: string }
  created_at: string,
  updated_at: string
  closed_at: string,
  state: 'OPEN' | 'COMPLETED' | 'CANCELED' | 'DRAFT'
  version: number,
  total_money: SquareMoney
  total_tax_money: SquareMoney,
  total_discount_money: SquareMoney
  total_tip_money: SquareMoney,
  total_service_charge_money: SquareMoney
  ticket_name: string,
  pricing_options: SquareOrderPricingOptions
  rewards: SquareOrderReward[]
}

interface SquareOrderSource {
  name: string
}

interface SquareOrderLineItem {
  uid: string,
  name: string
  quantity: string,
  item_type: 'ITEM' | 'CUSTOM_AMOUNT' | 'GIFT_CARD'
  base_price_money: SquareMoney,
  variation_total_price_money: SquareMoney
  gross_sales_money: SquareMoney,
  total_tax_money: SquareMoney
  total_discount_money: SquareMoney,
  total_money: SquareMoney
  catalog_object_id: string,
  catalog_version: number
  note: string,
  modifiers: SquareOrderLineItemModifier[]
  applied_taxes: SquareOrderLineItemAppliedTax[],
  applied_discounts: SquareOrderLineItemAppliedDiscount[]
  applied_service_charges: SquareOrderLineItemAppliedServiceCharge[],
  metadata: { [key: string]: string }
}

interface SquareOrderLineItemModifier {
  uid: string,
  catalog_object_id: string
  catalog_version: number,
  name: string
  quantity: string,
  base_price_money: SquareMoney
  total_price_money: SquareMoney,
  metadata: { [key: string]: string }
}

interface SquareOrderLineItemAppliedTax {
  uid: string,
  tax_uid: string
  applied_money: SquareMoney
}

interface SquareOrderLineItemAppliedDiscount {
  uid: string,
  discount_uid: string
  applied_money: SquareMoney
}

interface SquareOrderLineItemAppliedServiceCharge {
  uid: string,
  service_charge_uid: string
  applied_money: SquareMoney
}

interface SquareOrderTax {
  uid: string,
  catalog_object_id: string
  catalog_version: number,
  name: string
  type: 'UNKNOWN_TAX' | 'ADDITIVE' | 'INCLUSIVE',
  percentage: string
  applied_money: SquareMoney,
  scope: 'OTHER_TAX_SCOPE' | 'LINE_ITEM' | 'ORDER'
  auto_applied: boolean
}

interface SquareOrderDiscount {
  uid: string,
  catalog_object_id: string
  catalog_version: number,
  name: string
  type:
    | 'UNKNOWN_DISCOUNT'
    | 'FIXED_PERCENTAGE'
    | 'FIXED_AMOUNT'
    | 'VARIABLE_PERCENTAGE'
    | 'VARIABLE_AMOUNT'
  percentage: string,
  amount_money: SquareMoney
  applied_money: SquareMoney,
  scope: 'OTHER_DISCOUNT_SCOPE' | 'LINE_ITEM' | 'ORDER'
  reward_ids: string[],
  pricing_rule_id: string
}

interface SquareOrderServiceCharge {
  uid: string,
  catalog_object_id: string
  catalog_version: number,
  name: string
  percentage: string,
  amount_money: SquareMoney
  applied_money: SquareMoney,
  total_money: SquareMoney
  total_tax_money: SquareMoney,
  calculation_phase: 'SUBTOTAL_PHASE' | 'TOTAL_PHASE'
  taxable: boolean,
  applied_taxes: SquareOrderLineItemAppliedTax[]
  metadata: { [key: string]: string }
  type: 'AUTO_GRATUITY' | 'CUSTOM',
  treatment_type: 'APPORTIONED_TREATMENT' | 'LINE_ITEM_TREATMENT'
  scope: 'OTHER_SERVICE_CHARGE_SCOPE' | 'LINE_ITEM' | 'ORDER'
}

interface SquareOrderFulfillment {
  uid: string,
  type: 'PICKUP' | 'SHIPMENT' | 'DELIVERY'
  state: 'PROPOSED' | 'RESERVED' | 'PREPARED' | 'COMPLETED' | 'CANCELED' | 'FAILED',
  line_item_application: 'ALL' | 'ENTRY_LIST'
  entries: SquareOrderFulfillmentEntry[],
  metadata: { [key: string]: string }
  pickup_details: SquareOrderFulfillmentPickupDetails,
  shipment_details: SquareOrderFulfillmentShipmentDetails
  delivery_details: SquareOrderFulfillmentDeliveryDetails
}

interface SquareOrderFulfillmentEntry {
  uid: string,
  line_item_uid: string
  quantity: string,
  metadata: { [key: string]: string }
}

interface SquareOrderFulfillmentPickupDetails {
  recipient: SquareOrderFulfillmentRecipient,
  expires_at: string
  auto_complete_duration: string,
  schedule_type: 'SCHEDULED' | 'ASAP'
  pickup_at: string,
  pickup_window_duration: string
  prep_time_duration: string,
  note: string
  placed_at: string,
  accepted_at: string
  rejected_at: string,
  ready_at: string
  expired_at: string,
  picked_up_at: string
  canceled_at: string,
  cancel_reason: string
  is_curbside_pickup: boolean,
  curbside_pickup_details: SquareOrderFulfillmentPickupDetailsCurbsidePickupDetails
}

interface SquareOrderFulfillmentRecipient {
  customer_id: string,
  display_name: string
  email_address: string,
  phone_number: string
  address: SquareAddress
}

interface SquareOrderFulfillmentPickupDetailsCurbsidePickupDetails {
  curbside_details: string,
  buyer_arrived_at: string
}

interface SquareOrderFulfillmentShipmentDetails {
  recipient: SquareOrderFulfillmentRecipient,
  carrier: string
  shipping_note: string,
  shipping_type: string
  tracking_number: string,
  tracking_url: string
  placed_at: string,
  in_progress_at: string
  packaged_at: string,
  expected_shipped_at: string
  shipped_at: string,
  canceled_at: string
  cancel_reason: string,
  failed_at: string
  failure_reason: string
}

interface SquareOrderFulfillmentDeliveryDetails {
  recipient: SquareOrderFulfillmentRecipient,
  schedule_type: 'SCHEDULED' | 'ASAP'
  placed_at: string,
  deliver_at: string
  prep_time_duration: string,
  delivery_window_duration: string
  note: string,
  completed_at: string
  in_progress_at: string,
  rejected_at: string
  ready_at: string,
  delivered_at: string
  canceled_at: string,
  cancel_reason: string
  courier_pickup_at: string,
  courier_pickup_window_duration: string
  is_no_contact_delivery: boolean,
  dropoff_notes: string
  courier_provider_name: string,
  courier_support_phone_number: string
  square_delivery_id: string,
  external_delivery_id: string
  managed_delivery: boolean
}

interface SquareOrderReturn {
  uid: string,
  source_order_uid: string
  return_line_items: SquareOrderReturnLineItem[],
  return_service_charges: SquareOrderReturnServiceCharge[]
  return_taxes: SquareOrderReturnTax[],
  return_discounts: SquareOrderReturnDiscount[]
  rounding_adjustment: SquareOrderRoundingAdjustment,
  return_amounts: SquareOrderMoneyAmounts
}

interface SquareOrderReturnLineItem {
  uid: string,
  source_line_item_uid: string
  name: string,
  quantity: string
  quantity_unit: SquareOrderQuantityUnit,
  note: string
  catalog_object_id: string,
  catalog_version: number
  variation_name: string,
  item_type: 'ITEM' | 'CUSTOM_AMOUNT' | 'GIFT_CARD'
  return_modifiers: SquareOrderReturnModifier[],
  applied_taxes: SquareOrderLineItemAppliedTax[]
  applied_discounts: SquareOrderLineItemAppliedDiscount[],
  applied_service_charges: SquareOrderLineItemAppliedServiceCharge[]
  base_price_money: SquareMoney,
  variation_total_price_money: SquareMoney
  gross_return_money: SquareMoney,
  total_tax_money: SquareMoney
  total_discount_money: SquareMoney,
  total_money: SquareMoney
}

interface SquareOrderReturnModifier {
  uid: string,
  source_modifier_uid: string
  catalog_object_id: string,
  catalog_version: number
  name: string,
  base_price_money: SquareMoney
  total_price_money: SquareMoney,
  quantity: string
}

interface SquareOrderReturnServiceCharge {
  uid: string,
  source_service_charge_uid: string
  name: string,
  catalog_object_id: string
  catalog_version: number,
  percentage: string
  amount_money: SquareMoney,
  applied_money: SquareMoney
  total_money: SquareMoney,
  total_tax_money: SquareMoney
  calculation_phase: 'SUBTOTAL_PHASE' | 'TOTAL_PHASE',
  taxable: boolean
  applied_taxes: SquareOrderLineItemAppliedTax[],
  treatment_type: 'APPORTIONED_TREATMENT' | 'LINE_ITEM_TREATMENT'
  scope: 'OTHER_SERVICE_CHARGE_SCOPE' | 'LINE_ITEM' | 'ORDER'
}

interface SquareOrderReturnTax {
  uid: string,
  source_tax_uid: string
  catalog_object_id: string,
  catalog_version: number
  name: string,
  type: 'UNKNOWN_TAX' | 'ADDITIVE' | 'INCLUSIVE'
  percentage: string,
  applied_money: SquareMoney
  scope: 'OTHER_TAX_SCOPE' | 'LINE_ITEM' | 'ORDER'
}

interface SquareOrderReturnDiscount {
  uid: string,
  source_discount_uid: string
  catalog_object_id: string,
  catalog_version: number
  name: string,
  type:
    | 'UNKNOWN_DISCOUNT'
    | 'FIXED_PERCENTAGE'
    | 'FIXED_AMOUNT'
    | 'VARIABLE_PERCENTAGE'
    | 'VARIABLE_AMOUNT'
  percentage: string,
  amount_money: SquareMoney
  applied_money: SquareMoney,
  scope: 'OTHER_DISCOUNT_SCOPE' | 'LINE_ITEM' | 'ORDER'
}

interface SquareOrderQuantityUnit {
  measurement_unit: SquareMeasurementUnit,
  precision: number
  catalog_object_id: string,
  catalog_version: number
}

interface SquareMeasurementUnit {
  custom_unit: SquareMeasurementUnitCustom,
  area_unit: string
  length_unit: string,
  volume_unit: string
  weight_unit: string,
  generic_unit: string
  time_unit: string,
  type:
    | 'TYPE_CUSTOM'
    | 'TYPE_AREA'
    | 'TYPE_LENGTH'
    | 'TYPE_VOLUME'
    | 'TYPE_WEIGHT'
    | 'TYPE_GENERIC'
    | 'TYPE_TIME'
}

interface SquareMeasurementUnitCustom {
  name: string,
  abbreviation: string
}

interface SquareOrderRoundingAdjustment {
  uid: string,
  name: string
  amount_money: SquareMoney
}

interface SquareOrderMoneyAmounts {
  total_money: SquareMoney,
  tax_money: SquareMoney
  discount_money: SquareMoney,
  tip_money: SquareMoney
  service_charge_money: SquareMoney
}

interface SquareOrderTender {
  id: string,
  location_id: string
  transaction_id: string,
  created_at: string
  note: string,
  amount_money: SquareMoney
  tip_money: SquareMoney,
  processing_fee_money: SquareMoney
  customer_id: string,
  type:
    | 'CARD'
    | 'CASH'
    | 'THIRD_PARTY_CARD'
    | 'SQUARE_GIFT_CARD'
    | 'NO_SALE'
    | 'WALLET'
    | 'BANK_ACCOUNT'
    | 'BUY_NOW_PAY_LATER'
    | 'OTHER'
  card_details: SquareOrderTenderCardDetails,
  cash_details: SquareOrderTenderCashDetails
  additional_recipients: SquareAdditionalRecipient[],
  payment_id: string
  bank_account_details: SquareOrderTenderBankAccountDetails,
  buy_now_pay_later_details: SquareOrderTenderBuyNowPayLaterDetails
  square_account_details: SquareOrderTenderSquareAccountDetails
}

interface SquareOrderTenderCardDetails {
  status: 'AUTHORIZED' | 'CAPTURED' | 'VOIDED' | 'FAILED',
  card: SquareCard
  entry_method: 'SWIPED' | 'KEYED' | 'EMV' | 'ON_FILE' | 'CONTACTLESS'
}

interface SquareOrderTenderCashDetails {
  buyer_tendered_money: SquareMoney,
  change_back_money: SquareMoney
}

interface SquareOrderTenderBankAccountDetails {
  status: 'AUTHORIZED' | 'CAPTURED' | 'VOIDED' | 'FAILED'
}

interface SquareOrderTenderBuyNowPayLaterDetails {
  buy_now_pay_later_brand: 'SEZZLE' | 'AFTERPAY' | 'CLEARPAY' | 'UNKNOWN',
  status: 'AUTHORIZED' | 'CAPTURED' | 'VOIDED' | 'FAILED'
}

interface SquareOrderTenderSquareAccountDetails {
  status: 'AUTHORIZED' | 'CAPTURED' | 'VOIDED' | 'FAILED'
}

interface SquareOrderRefund {
  id: string,
  location_id: string
  transaction_id: string,
  tender_id: string
  reason: string,
  amount_money: SquareMoney
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED',
  created_at: string
  processing_fee_money: SquareMoney,
  additional_recipients: SquareAdditionalRecipient[]
}

interface SquareOrderPricingOptions {
  auto_apply_discounts: boolean,
  auto_apply_taxes: boolean
}

interface SquareOrderReward {
  id: string,
  reward_tier_id: string
}

interface SquareCustomer {
  id: string,
  created_at: string
  updated_at: string,
  cards: SquareCard[]
  given_name: string,
  family_name: string
  nickname: string,
  company_name: string
  email_address: string,
  address: SquareAddress
  phone_number: string,
  birthday: string
  reference_id: string,
  note: string
  preferences: SquareCustomerPreferences,
  creation_source:
    | 'OTHER'
    | 'APPOINTMENTS'
    | 'COUPON'
    | 'DELETION_RECOVERY'
    | 'DIRECTORY'
    | 'EGIFTING'
    | 'EMAIL_COLLECTION'
    | 'FEEDBACK'
    | 'IMPORT'
    | 'INVOICES'
    | 'LOYALTY'
    | 'MARKETING'
    | 'MERGE'
    | 'ONLINE_STORE'
    | 'INSTANT_PROFILE'
    | 'TERMINAL'
    | 'THIRD_PARTY'
    | 'THIRD_PARTY_IMPORT'
    | 'UNMERGE_RECOVERY'
  group_ids: string[],
  segment_ids: string[]
  version: number
}

interface SquareCustomerPreferences {
  email_unsubscribed: boolean
}

export class SquareIntegration extends BaseIntegration {
  readonly provider = 'square'
  readonly name = 'Square'
  readonly version = '1.0.0'

  private readonly apiBaseUrl = 'https://connect.squareup.com/v2'
  private readonly sandboxApiBaseUrl = 'https://connect.squareupsandbox.com/v2'

  constructor(
    userId: string,
    accessToken: string
    refreshToken?: string,
    private config?: IntegrationConfig,
  ) {
    super(userId, accessToken, refreshToken)
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const response = await this.executeWithProtection('auth.test', async () => {
        return this.makeApiCall('/locations', 'GET')
      })

      return {
        success: true,
        accessToken: this.accessToken
        refreshToken: this.refreshTokenValue,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Square access tokens don't expire
        scope: [
          'MERCHANT_PROFILE_READ',
          'PAYMENTS_READ',
          'PAYMENTS_WRITE',
          'ORDERS_READ',
          'ORDERS_WRITE',
          'CUSTOMERS_READ',
          'CUSTOMERS_WRITE',
        ],
        data: response?.locations
      }
    } catch (error) {
      this.logError('authenticate', error as Error)
      return {
        success: false,
        error: 'Authentication failed: ' + (error as Error).message
      }
    }
  }

  async refreshToken(): Promise<AuthResult> {
    try {
      if (!this.refreshTokenValue || !this.config) {
        throw new AuthenticationError('No refresh token or config available')
      }

      const response = await fetch('https://connect.squareup.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({,
          client_id: this.config.clientId
          client_secret: this.config.clientSecret,
          grant_type: 'refresh_token'
          refresh_token: this.refreshTokenValue
        })
      })

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`)
      }

      const tokenData: SquareTokenResponse = await response.json()

      this.accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        this.refreshTokenValue = tokenData.refresh_token
      }

      return {
        success: true,
        accessToken: tokenData.access_token
        refreshToken: tokenData.refresh_token || this.refreshTokenValue,
        expiresAt: tokenData.expires_at
          ? new Date(tokenData.expires_at)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        scope: [
          'MERCHANT_PROFILE_READ',
          'PAYMENTS_READ',
          'PAYMENTS_WRITE',
          'ORDERS_READ',
          'ORDERS_WRITE',
          'CUSTOMERS_READ',
          'CUSTOMERS_WRITE',
        ]
      }
    } catch (error) {
      this.logError('refreshToken', error as Error)
      return {
        success: false,
        error: 'Token refresh failed: ' + (error as Error).message
      }
    }
  }

  async getCapabilities(): Promise<IntegrationCapability[]> {
    return [
      IntegrationCapability.PAYMENTS,
      IntegrationCapability.ORDERS,
      IntegrationCapability.CUSTOMERS,
      IntegrationCapability.INVENTORY,
      IntegrationCapability.WEBHOOKS,
    ]
  }

  async testConnection(): Promise<ConnectionStatus> {
    try {
      const response = await this.executeWithProtection('connection.test', async () => {
        return this.makeApiCall('/locations', 'GET')
      })

      const locations = response?.locations || []
      const mainLocation = locations[0]

      return {
        status: 'connected',
        lastChecked: new Date()
        details: {,
          locationId: mainLocation?.id
          locationName: mainLocation?.name,
          businessName: mainLocation?.business_name
          country: mainLocation?.country,
          currency: mainLocation?.currency
          merchantId: mainLocation?.merchant_id
        }
      }
    } catch (error) {
      this.logError('testConnection', error as Error)
      return {
        status: 'error',
        lastChecked: new Date()
        error: (error as Error).message
      }
    }
  }

  async sync(): Promise<SyncResult> {
    try {
      const startTime = new Date()
      let totalProcessed = 0
      let totalErrors = 0
      const errors: string[] = []

      // Sync payments
      try {
        const paymentResult = await this.syncPayments()
        totalProcessed += paymentResult.processed
        totalErrors += paymentResult.errors
        if (paymentResult.errorMessages) {
          errors.push(...paymentResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Payment sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync orders
      try {
        const orderResult = await this.syncOrders()
        totalProcessed += orderResult.processed
        totalErrors += orderResult.errors
        if (orderResult.errorMessages) {
          errors.push(...orderResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Order sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      // Sync customers
      try {
        const customerResult = await this.syncCustomers()
        totalProcessed += customerResult.processed
        totalErrors += customerResult.errors
        if (customerResult.errorMessages) {
          errors.push(...customerResult.errorMessages)
        }
      } catch (error) {
        errors.push(`Customer sync failed: ${(error as Error).message}`)
        totalErrors++
      }

      return {
        success: totalErrors === 0,
        timestamp: new Date()
        duration: Date.now() - startTime.getTime(),
        itemsProcessed: totalProcessed
        itemsAdded: totalProcessed - totalErrors,
        itemsUpdated: 0
        itemsDeleted: 0,
        errors: totalErrors
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      this.logError('sync', error as Error)
      throw new SyncError(`Square sync failed: ${(error as Error).message}`)
    }
  }

  async handleWebhook(payload: GenericWebhookPayload): Promise<ApiResponse> {
    try {
      const squarePayload = payload as SquareWebhookPayload

      switch (squarePayload.type) {
        case 'square.payment.created':
        case 'square.payment.updated':
          await this.handlePaymentWebhook(squarePayload)
          break
        case 'square.order.created':
        case 'square.order.updated':
        case 'square.order.fulfilled':
          await this.handleOrderWebhook(squarePayload)
          break
        case 'square.customer.created':
        case 'square.customer.updated':
        case 'square.customer.deleted':
          await this.handleCustomerWebhook(squarePayload)
          break
        case 'square.inventory.count.updated':
          await this.handleInventoryWebhook(squarePayload)
          break
        default:
          this.logger.warn(`Unknown webhook type: ${squarePayload.type}`)
      }

      return {
        success: true,
        data: { processed: true },
        message: 'Webhook processed successfully'
      }
    } catch (error) {
      this.logError('handleWebhook', error as Error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      // Square doesn't have a token revocation endpoint for production apps
      return true
    } catch (error) {
      this.logError('disconnect' error as Error)
      return false
    }
  }

  // Private sync methods
  private async syncPayments(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.payments', async () => {
        return this.makeApiCall('/payments', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const payments = response?.payments || []

      for (const payment of payments) {
        try {
          await this.processPayment(payment)
          processed++
        } catch (error) {
          errors.push(`Failed to process payment ${payment.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Payment sync failed: ${(error as Error).message}`)
    }
  }

  private async syncOrders(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.orders', async () => {
        return this.makeApiCall('/orders/search', 'POST', {
          query: {,
            filter: {
              state_filter: {,
                states: ['OPEN', 'COMPLETED']
              }
            }
          }
        })
      })

      let processed = 0
      const errors: string[] = []

      const orders = response?.orders || []

      for (const order of orders) {
        try {
          await this.processOrder(order)
          processed++
        } catch (error) {
          errors.push(`Failed to process order ${order.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Order sync failed: ${(error as Error).message}`)
    }
  }

  private async syncCustomers(): Promise<{
    processed: number,
    errors: number
    errorMessages?: string[]
  }> {
    try {
      const response = await this.executeWithProtection('sync.customers', async () => {
        return this.makeApiCall('/customers', 'GET')
      })

      let processed = 0
      const errors: string[] = []

      const customers = response?.customers || []

      for (const customer of customers) {
        try {
          await this.processCustomer(customer)
          processed++
        } catch (error) {
          errors.push(`Failed to process customer ${customer.id}: ${(error as Error).message}`)
        }
      }

      return {
        processed,
        errors: errors.length,
        errorMessages: errors.length > 0 ? errors : undefined
      }
    } catch (error) {
      throw new SyncError(`Customer sync failed: ${(error as Error).message}`)
    }
  }

  // Private processing methods
  private async processPayment(payment: any): Promise<void> {
    this.logger.debug(`Processing Square payment: ${payment.id}`)
    // Process payment data for Aurelius AI system
  }

  private async processOrder(order: any): Promise<void> {
    this.logger.debug(`Processing Square order: ${order.id}`)
    // Process order data for Aurelius AI system
  }

  private async processCustomer(customer: any): Promise<void> {
    this.logger.debug(`Processing Square customer: ${customer.id}`)
    // Process customer data for Aurelius AI system
  }

  // Private webhook handlers
  private async handlePaymentWebhook(payload: SquareWebhookPayload): Promise<void> {
    this.logger.debug(`Handling payment webhook: ${payload.id}`)
    // Handle payment webhook processing
  }

  private async handleOrderWebhook(payload: SquareWebhookPayload): Promise<void> {
    this.logger.debug(`Handling order webhook: ${payload.id}`)
    // Handle order webhook processing
  }

  private async handleCustomerWebhook(payload: SquareWebhookPayload): Promise<void> {
    this.logger.debug(`Handling customer webhook: ${payload.id}`)
    // Handle customer webhook processing
  }

  private async handleInventoryWebhook(payload: SquareWebhookPayload): Promise<void> {
    this.logger.debug(`Handling inventory webhook: ${payload.id}`)
    // Handle inventory webhook processing
  }

  // Helper method for API calls
  private async makeApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
    body?: unknown,
  ): Promise<any> {
    const isProduction = this.config?.environment === 'production'
    const baseUrl = isProduction ? this.apiBaseUrl : this.sandboxApiBaseUrl
    const url = `${baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
      'Square-Version': '2023-10-18'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Square API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
      )
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {}
    }

    return response.json()
  }

  // Public API methods
  async getLocations(): Promise<SquareLocation[]> {
    try {
      const response = await this.executeWithProtection('api.get_locations', async () => {
        return this.makeApiCall('/locations', 'GET')
      })

      return response?.locations || []
    } catch (error) {
      this.logError('getLocations', error as Error)
      throw new Error(`Failed to get locations: ${(error as Error).message}`)
    }
  }

  async getLocation(locationId: string): Promise<SquareLocation> {
    try {
      const response = await this.executeWithProtection('api.get_location', async () => {
        return this.makeApiCall(`/locations/${locationId}`, 'GET')
      })

      return response?.location
    } catch (error) {
      this.logError('getLocation', error as Error)
      throw new Error(`Failed to get location: ${(error as Error).message}`)
    }
  }

  async getPayments(options?: {
    begin_time?: string
    end_time?: string
    sort_order?: 'ASC' | 'DESC'
    cursor?: string
    location_id?: string
    total?: number
    last_4?: string
    card_brand?: string
    limit?: number
  }): Promise<{ payments: SquarePayment[]; cursor?: string }> {
    try {
      const params = new URLSearchParams()
      if (options?.begin_time) params.append('begin_time', options.begin_time)
      if (options?.end_time) params.append('end_time', options.end_time)
      if (options?.sort_order) params.append('sort_order', options.sort_order)
      if (options?.cursor) params.append('cursor', options.cursor)
      if (options?.location_id) params.append('location_id', options.location_id)
      if (options?.total) params.append('total', options.total.toString())
      if (options?.last_4) params.append('last_4', options.last_4)
      if (options?.card_brand) params.append('card_brand', options.card_brand)
      if (options?.limit) params.append('limit', options.limit.toString())

      const queryString = params.toString()
      const endpoint = queryString ? `/payments?${queryString}` : '/payments'

      const response = await this.executeWithProtection('api.get_payments', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return {
        payments: response?.payments || [],
        cursor: response?.cursor
      }
    } catch (error) {
      this.logError('getPayments', error as Error)
      throw new Error(`Failed to get payments: ${(error as Error).message}`)
    }
  }

  async getPayment(paymentId: string): Promise<SquarePayment> {
    try {
      const response = await this.executeWithProtection('api.get_payment', async () => {
        return this.makeApiCall(`/payments/${paymentId}`, 'GET')
      })

      return response?.payment
    } catch (error) {
      this.logError('getPayment', error as Error)
      throw new Error(`Failed to get payment: ${(error as Error).message}`)
    }
  }

  async createPayment(paymentData: {,
    source_id: string
    idempotency_key: string,
    amount_money: {
      amount: number,
      currency: string
    }
    tip_money?: {
      amount: number,
      currency: string
    }
    app_fee_money?: {
      amount: number,
      currency: string
    }
    delay_duration?: string
    delay_action?: 'CANCEL' | 'COMPLETE'
    autocomplete?: boolean
    order_id?: string
    customer_id?: string
    location_id?: string
    team_member_id?: string
    reference_id?: string
    verification_token?: string
    accept_partial_authorization?: boolean
    buyer_email_address?: string
    billing_address?: Partial<SquareAddress>
    shipping_address?: Partial<SquareAddress>
    note?: string
    statement_description_identifier?: string
    cash_details?: {
      buyer_tendered_money: {,
        amount: number
        currency: string
      }
      change_back_money?: {
        amount: number,
        currency: string
      }
    }
    external_details?: {
      type: string,
      source: string
      source_id?: string
      source_fee_money?: {
        amount: number,
        currency: string
      }
    }
  }): Promise<SquarePayment> {
    try {
      const response = await this.executeWithProtection('api.create_payment', async () => {
        return this.makeApiCall('/payments', 'POST', paymentData)
      })

      return response?.payment
    } catch (error) {
      this.logError('createPayment', error as Error)
      throw new Error(`Failed to create payment: ${(error as Error).message}`)
    }
  }

  async cancelPayment(paymentId: string): Promise<SquarePayment> {
    try {
      const response = await this.executeWithProtection('api.cancel_payment', async () => {
        return this.makeApiCall(`/payments/${paymentId}/cancel`, 'POST')
      })

      return response?.payment
    } catch (error) {
      this.logError('cancelPayment', error as Error)
      throw new Error(`Failed to cancel payment: ${(error as Error).message}`)
    }
  }

  async completePayment(paymentId: string): Promise<SquarePayment> {
    try {
      const response = await this.executeWithProtection('api.complete_payment', async () => {
        return this.makeApiCall(`/payments/${paymentId}/complete`, 'POST')
      })

      return response?.payment
    } catch (error) {
      this.logError('completePayment', error as Error)
      throw new Error(`Failed to complete payment: ${(error as Error).message}`)
    }
  }

  async searchOrders(searchQuery: {
    location_ids?: string[]
    cursor?: string
    query?: {
      filter?: {
        state_filter?: {
          states: ('OPEN' | 'COMPLETED' | 'CANCELED' | 'DRAFT')[]
        }
        date_time_filter?: {
          created_at?: {
            start_at?: string
            end_at?: string
          }
          updated_at?: {
            start_at?: string
            end_at?: string
          }
          closed_at?: {
            start_at?: string
            end_at?: string
          }
        }
        fulfillment_filter?: {
          fulfillment_types?: ('PICKUP' | 'SHIPMENT' | 'DELIVERY')[]
          fulfillment_states?: (
            | 'PROPOSED'
            | 'RESERVED'
            | 'PREPARED'
            | 'COMPLETED'
            | 'CANCELED'
            | 'FAILED'
          )[]
        }
        source_filter?: {
          source_names?: string[]
        }
        customer_filter?: {
          customer_ids?: string[]
        }
      }
      sort?: {
        sort_field: 'CREATED_AT' | 'UPDATED_AT'
        sort_order?: 'ASC' | 'DESC'
      }
    }
    limit?: number
    return_entries?: boolean
  }): Promise<{ orders: SquareOrder[]; cursor?: string }> {
    try {
      const response = await this.executeWithProtection('api.search_orders', async () => {
        return this.makeApiCall('/orders/search', 'POST', searchQuery)
      })

      return {
        orders: response?.orders || [],
        cursor: response?.cursor
      }
    } catch (error) {
      this.logError('searchOrders', error as Error)
      throw new Error(`Failed to search orders: ${(error as Error).message}`)
    }
  }

  async createOrder(orderData: {
    location_id?: string
    reference_id?: string
    source?: {
      name?: string
    }
    customer_id?: string
    line_items?: Array<{
      uid?: string
      name?: string
      quantity: string
      item_type?: 'ITEM' | 'CUSTOM_AMOUNT' | 'GIFT_CARD'
      base_price_money?: {
        amount: number,
        currency: string
      }
      catalog_object_id?: string
      catalog_version?: number
      note?: string
      modifiers?: Array<{
        uid?: string
        catalog_object_id?: string
        catalog_version?: number
        name?: string
        base_price_money?: {
          amount: number,
          currency: string
        }
      }>
    }>
    taxes?: Array<{
      uid?: string
      catalog_object_id?: string
      catalog_version?: number
      name?: string
      type?: 'UNKNOWN_TAX' | 'ADDITIVE' | 'INCLUSIVE'
      percentage?: string
      scope?: 'OTHER_TAX_SCOPE' | 'LINE_ITEM' | 'ORDER'
    }>
    discounts?: Array<{
      uid?: string
      catalog_object_id?: string
      catalog_version?: number
      name?: string
      type?:
        | 'UNKNOWN_DISCOUNT'
        | 'FIXED_PERCENTAGE'
        | 'FIXED_AMOUNT'
        | 'VARIABLE_PERCENTAGE'
        | 'VARIABLE_AMOUNT'
      percentage?: string
      amount_money?: {
        amount: number,
        currency: string
      }
      scope?: 'OTHER_DISCOUNT_SCOPE' | 'LINE_ITEM' | 'ORDER'
    }>
    service_charges?: Array<{
      uid?: string
      catalog_object_id?: string
      catalog_version?: number
      name?: string
      percentage?: string
      amount_money?: {
        amount: number,
        currency: string
      }
      calculation_phase?: 'SUBTOTAL_PHASE' | 'TOTAL_PHASE'
      taxable?: boolean
      scope?: 'OTHER_SERVICE_CHARGE_SCOPE' | 'LINE_ITEM' | 'ORDER'
    }>
    fulfillments?: Array<{
      uid?: string
      type?: 'PICKUP' | 'SHIPMENT' | 'DELIVERY'
      state?: 'PROPOSED' | 'RESERVED' | 'PREPARED' | 'COMPLETED' | 'CANCELED' | 'FAILED'
      pickup_details?: {
        recipient?: {
          display_name?: string
          email_address?: string
          phone_number?: string
        }
        expires_at?: string
        auto_complete_duration?: string
        schedule_type?: 'SCHEDULED' | 'ASAP'
        pickup_at?: string
        pickup_window_duration?: string
        prep_time_duration?: string
        note?: string
        is_curbside_pickup?: boolean
        curbside_pickup_details?: {
          curbside_details?: string
        }
      }
      shipment_details?: {
        recipient?: {
          display_name?: string
          email_address?: string
          phone_number?: string
          address?: Partial<SquareAddress>
        }
        carrier?: string
        shipping_note?: string
        shipping_type?: string
        tracking_number?: string
        tracking_url?: string
        expected_shipped_at?: string
      }
      delivery_details?: {
        recipient?: {
          display_name?: string
          email_address?: string
          phone_number?: string
          address?: Partial<SquareAddress>
        }
        schedule_type?: 'SCHEDULED' | 'ASAP'
        deliver_at?: string
        prep_time_duration?: string
        delivery_window_duration?: string
        note?: string
        is_no_contact_delivery?: boolean
        dropoff_notes?: string
        courier_pickup_window_duration?: string
        managed_delivery?: boolean
      }
    }>
    metadata?: { [key: string]: string }
    pricing_options?: {
      auto_apply_discounts?: boolean
      auto_apply_taxes?: boolean
    }
    rewards?: Array<{
      id: string,
      reward_tier_id: string
    }>
  }): Promise<SquareOrder> {
    try {
      const response = await this.executeWithProtection('api.create_order', async () => {
        return this.makeApiCall('/orders', 'POST', { order: orderData })
      })

      return response?.order
    } catch (error) {
      this.logError('createOrder', error as Error)
      throw new Error(`Failed to create order: ${(error as Error).message}`)
    }
  }

  async getCustomers(options?: {
    cursor?: string
    limit?: number
    sort_field?: 'DEFAULT' | 'CREATED_AT'
    sort_order?: 'ASC' | 'DESC'
    count?: boolean
  }): Promise<{ customers: SquareCustomer[]; cursor?: string }> {
    try {
      const params = new URLSearchParams()
      if (options?.cursor) params.append('cursor', options.cursor)
      if (options?.limit) params.append('limit', options.limit.toString())
      if (options?.sort_field) params.append('sort_field', options.sort_field)
      if (options?.sort_order) params.append('sort_order', options.sort_order)
      if (options?.count) params.append('count', options.count.toString())

      const queryString = params.toString()
      const endpoint = queryString ? `/customers?${queryString}` : '/customers'

      const response = await this.executeWithProtection('api.get_customers', async () => {
        return this.makeApiCall(endpoint, 'GET')
      })

      return {
        customers: response?.customers || [],
        cursor: response?.cursor
      }
    } catch (error) {
      this.logError('getCustomers', error as Error)
      throw new Error(`Failed to get customers: ${(error as Error).message}`)
    }
  }

  async createCustomer(customerData: {
    given_name?: string
    family_name?: string
    company_name?: string
    nickname?: string
    email_address?: string
    address?: Partial<SquareAddress>
    phone_number?: string
    reference_id?: string
    note?: string
    birthday?: string
    tax_ids?: {
      eu_vat?: string
      fr_siret?: string
      fr_naf?: string
      es_nif?: string
      uk_vat?: string
    }
  }): Promise<SquareCustomer> {
    try {
      const response = await this.executeWithProtection('api.create_customer', async () => {
        return this.makeApiCall('/customers', 'POST', customerData)
      })

      return response?.customer
    } catch (error) {
      this.logError('createCustomer', error as Error)
      throw new Error(`Failed to create customer: ${(error as Error).message}`)
    }
  }

  async getCustomer(customerId: string): Promise<SquareCustomer> {
    try {
      const response = await this.executeWithProtection('api.get_customer', async () => {
        return this.makeApiCall(`/customers/${customerId}`, 'GET')
      })

      return response?.customer
    } catch (error) {
      this.logError('getCustomer', error as Error)
      throw new Error(`Failed to get customer: ${(error as Error).message}`)
    }
  }

  async updateCustomer(
    customerId: string,
    customerData: {
      given_name?: string
      family_name?: string
      company_name?: string
      nickname?: string
      email_address?: string
      address?: Partial<SquareAddress>
      phone_number?: string
      reference_id?: string
      note?: string
      birthday?: string
      version?: number
    },
  ): Promise<SquareCustomer> {
    try {
      const response = await this.executeWithProtection('api.update_customer', async () => {
        return this.makeApiCall(`/customers/${customerId}`, 'PUT', customerData)
      })

      return response?.customer
    } catch (error) {
      this.logError('updateCustomer', error as Error)
      throw new Error(`Failed to update customer: ${(error as Error).message}`)
    }
  }

  async deleteCustomer(customerId: string, version?: number): Promise<void> {
    try {
      const params = version ? `?version=${version}` : ''

      await this.executeWithProtection('api.delete_customer', async () => {
        return this.makeApiCall(`/customers/${customerId}${params}`, 'DELETE')
      })
    } catch (error) {
      this.logError('deleteCustomer', error as Error)
      throw new Error(`Failed to delete customer: ${(error as Error).message}`)
    }
  }

  async verifyWebhook(
    body: string,
    signature: string
    signatureKey: string,
    notificationUrl: string
  ): Promise<boolean> {
    try {
      // Square uses a specific webhook verification process
      const payload = notificationUrl + body
      const expectedSignature = crypto
        .createHmac('sha256', signatureKey)
        .update(payload, 'utf8')
        .digest('base64')

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    } catch (error) {
      this.logError('verifyWebhook' error as Error)
      return false
    }
  }
}

#!/bin/bash

# Big Company Rwanda - Product Seeding Script (API Token Version)
# Seeds Rwandan products into Medusa using admin API token

API_TOKEN="bigcompany_admin_api_token_2024_2014a5199818d2a9"
BASE_URL="http://localhost:9001"

echo "=== Big Company Rwanda - Product Seeding ==="

# First create region if not exists
echo "Creating Rwanda region..."
REGION_RESP=$(curl -s -X POST "$BASE_URL/admin/regions" \
  -H "x-medusa-access-token: $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rwanda",
    "currency_code": "rwf",
    "tax_rate": 18,
    "payment_providers": ["manual"],
    "fulfillment_providers": ["manual"],
    "countries": ["rw"]
  }')

REGION_ID=$(echo "$REGION_RESP" | jq -r '.region.id // empty')
if [ -z "$REGION_ID" ]; then
  # Get existing region
  REGIONS=$(curl -s "$BASE_URL/admin/regions" -H "x-medusa-access-token: $API_TOKEN")
  REGION_ID=$(echo "$REGIONS" | jq -r '.regions[0].id // empty')
fi
echo "Region ID: $REGION_ID"

# Create sales channel
echo "Creating sales channel..."
SC_RESP=$(curl -s -X POST "$BASE_URL/admin/sales-channels" \
  -H "x-medusa-access-token: $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Big Company Store","description":"Rwanda FMCG Marketplace"}')

SC_ID=$(echo "$SC_RESP" | jq -r '.sales_channel.id // empty')
if [ -z "$SC_ID" ]; then
  SCS=$(curl -s "$BASE_URL/admin/sales-channels" -H "x-medusa-access-token: $API_TOKEN")
  SC_ID=$(echo "$SCS" | jq -r '.sales_channels[0].id // empty')
fi
echo "Sales Channel ID: $SC_ID"

# Create shipping options
echo "Creating shipping options..."
curl -s -X POST "$BASE_URL/admin/shipping-options" \
  -H "x-medusa-access-token: $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Standard Delivery - Kigali\",
    \"region_id\": \"$REGION_ID\",
    \"provider_id\": \"manual\",
    \"data\": {\"id\": \"manual-fulfillment\"},
    \"price_type\": \"flat_rate\",
    \"amount\": 2000,
    \"is_return\": false
  }" > /dev/null 2>&1

curl -s -X POST "$BASE_URL/admin/shipping-options" \
  -H "x-medusa-access-token: $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Express Delivery - Kigali\",
    \"region_id\": \"$REGION_ID\",
    \"provider_id\": \"manual\",
    \"data\": {\"id\": \"manual-fulfillment\"},
    \"price_type\": \"flat_rate\",
    \"amount\": 5000,
    \"is_return\": false
  }" > /dev/null 2>&1

# Function to create product
create_product() {
  local title="$1"
  local handle="$2"
  local description="$3"
  local price="$4"
  local option_title="$5"
  local option_value="$6"
  local quantity="$7"

  echo "Creating: $title"

  local resp=$(curl -s -X POST "$BASE_URL/admin/products" \
    -H "x-medusa-access-token: $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"title\": \"$title\",
      \"handle\": \"$handle\",
      \"description\": \"$description\",
      \"is_giftcard\": false,
      \"discountable\": true,
      \"status\": \"published\",
      \"options\": [{\"title\": \"$option_title\"}],
      \"variants\": [{
        \"title\": \"Default\",
        \"prices\": [{\"currency_code\": \"rwf\", \"amount\": $price}],
        \"options\": [{\"value\": \"$option_value\"}],
        \"inventory_quantity\": $quantity,
        \"manage_inventory\": true
      }]
    }")

  local prod_id=$(echo "$resp" | jq -r '.product.id // empty')
  if [ -n "$prod_id" ] && [ "$prod_id" != "null" ]; then
    echo "  ✓ $prod_id"
    # Add to sales channel
    curl -s -X POST "$BASE_URL/admin/sales-channels/$SC_ID/products/batch" \
      -H "x-medusa-access-token: $API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"product_ids\": [{\"id\": \"$prod_id\"}]}" > /dev/null 2>&1
  else
    echo "  ✗ Error: $(echo "$resp" | jq -r '.message // .type // "unknown error"')"
  fi
}

echo ""
echo "=== BEVERAGES ==="
create_product "Inyange Water 500ml" "inyange-water-500ml" "Pure natural mineral water from Rwanda" 300 "Size" "500ml" 500
create_product "Inyange Water 1.5L" "inyange-water-1-5l" "Large bottle of pure natural mineral water" 600 "Size" "1.5L" 300
create_product "Bralirwa Primus Beer 500ml" "bralirwa-primus-500ml" "Rwanda favorite lager beer" 1200 "Size" "500ml" 400
create_product "Bralirwa Mutzig Beer 500ml" "bralirwa-mutzig-500ml" "Premium Rwandan beer" 1300 "Size" "500ml" 350
create_product "Urwagwa Banana Wine 1L" "urwagwa-banana-wine-1l" "Traditional Rwandan banana wine" 8000 "Size" "1L" 100
create_product "Inyange Apple Juice 1L" "inyange-juice-apple-1l" "100% pure apple juice" 2500 "Size" "1L" 200
create_product "Inyange Passion Fruit Juice 1L" "inyange-juice-passion-1l" "Delicious passion fruit juice" 2500 "Size" "1L" 200

echo ""
echo "=== DAIRY ==="
create_product "Inyange Fresh Milk 500ml" "inyange-milk-500ml" "Fresh pasteurized milk" 800 "Size" "500ml" 300
create_product "Inyange Fresh Milk 1L" "inyange-milk-1l" "Fresh pasteurized milk 1 liter" 1500 "Size" "1L" 250
create_product "Ikivuguto Traditional Yogurt 500ml" "ikivuguto-500ml" "Traditional Rwandan fermented milk" 1200 "Size" "500ml" 150
create_product "Inyange Strawberry Yogurt 250ml" "inyange-yogurt-strawberry" "Creamy strawberry yogurt" 900 "Size" "250ml" 200
create_product "Inyange Butter 250g" "inyange-butter-250g" "Pure creamy butter" 3500 "Size" "250g" 100

echo ""
echo "=== FOOD & GROCERIES ==="
create_product "Rice Local 5kg" "rice-local-5kg" "Premium Rwandan rice" 7500 "Size" "5kg" 200
create_product "Isombe Cassava Leaves 500g" "isombe-500g" "Pre-prepared cassava leaves" 2000 "Size" "500g" 150
create_product "Ubugari Cassava Flour 2kg" "ubugari-flour-2kg" "Fine cassava flour" 3500 "Size" "2kg" 180
create_product "Red Beans 1kg" "beans-red-1kg" "Premium red kidney beans" 2200 "Size" "1kg" 250
create_product "Maize Flour 2kg" "maize-flour-2kg" "Fine maize flour" 2800 "Size" "2kg" 200
create_product "Sugar 1kg" "sugar-1kg" "Refined white sugar" 1800 "Size" "1kg" 300
create_product "Ubuki Honey 500g" "ubuki-honey-500g" "Pure natural Rwandan honey" 12000 "Size" "500g" 80

echo ""
echo "=== COOKING ESSENTIALS ==="
create_product "Akabanga Hot Chili Oil 100ml" "akabanga-chili-oil-100ml" "Famous Rwandan hot chili oil" 6000 "Size" "100ml" 200
create_product "Vegetable Cooking Oil 1L" "vegetable-oil-1l" "Pure vegetable cooking oil" 4500 "Size" "1L" 250
create_product "Palm Oil 500ml" "palm-oil-500ml" "Traditional palm oil" 3500 "Size" "500ml" 150
create_product "Iodized Salt 1kg" "salt-1kg" "Iodized table salt" 800 "Size" "1kg" 400
create_product "Tomato Paste 400g" "tomato-paste-400g" "Concentrated tomato paste" 2500 "Size" "400g" 180

echo ""
echo "=== PERSONAL CARE ==="
create_product "Geisha Soap Bar 175g" "soap-geisha-175g" "Gentle cleansing soap bar" 1200 "Size" "175g" 300
create_product "Close Up Toothpaste 100ml" "toothpaste-closeup-100ml" "Fresh breath toothpaste" 2000 "Size" "100ml" 200
create_product "Moisturizing Body Lotion 400ml" "body-lotion-400ml" "Moisturizing body lotion" 5500 "Size" "400ml" 120
create_product "OMO Washing Powder 1kg" "washing-powder-1kg" "Powerful cleaning detergent" 4000 "Size" "1kg" 180

echo ""
echo "=== GAS & FUEL ==="
create_product "LPG Gas Cylinder 6kg Refill" "lpg-gas-6kg-refill" "6kg LPG cooking gas refill" 8500 "Type" "Refill" 100
create_product "LPG Gas Cylinder 6kg New" "lpg-gas-6kg-new" "New 6kg LPG cylinder with gas" 35000 "Type" "New" 50
create_product "LPG Gas Cylinder 12kg Refill" "lpg-gas-12kg-refill" "12kg LPG cooking gas refill" 16500 "Type" "Refill" 80
create_product "LPG Gas Cylinder 12kg New" "lpg-gas-12kg-new" "New 12kg LPG cylinder with gas" 55000 "Type" "New" 30
create_product "Charcoal 50kg" "charcoal-50kg" "Premium quality charcoal" 25000 "Size" "50kg" 60

echo ""
echo "=== SEEDING COMPLETE ==="

# Verify
PRODUCTS=$(curl -s "$BASE_URL/store/products")
COUNT=$(echo "$PRODUCTS" | jq -r '.count')
echo ""
echo "Total products in store: $COUNT"

#!/bin/bash

# BIG Company Rwanda - Product Seeding Script
# Seeds products using the Medusa Admin API

API_URL="http://localhost:9001"
ADMIN_EMAIL="admin@bigcompany.rw"
ADMIN_PASSWORD="BigCompany2024!"

echo "=== BIG Company Rwanda Product Seeder ==="
echo ""

# First, create an admin user if it doesn't exist
echo "Creating admin user..."
curl -s -X POST "$API_URL/admin/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$ADMIN_EMAIL'",
    "password": "'$ADMIN_PASSWORD'"
  }' > /dev/null 2>&1

# Get admin token
echo "Getting admin token..."
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/admin/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$ADMIN_EMAIL'",
    "password": "'$ADMIN_PASSWORD'"
  }')

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "Failed to get admin token. Trying with session auth..."
  # Try session auth
  SESSION_RESPONSE=$(curl -s -X POST "$API_URL/admin/auth" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "'$ADMIN_EMAIL'",
      "password": "'$ADMIN_PASSWORD'"
    }' -c cookies.txt)

  echo "Session response: $SESSION_RESPONSE"
  AUTH_HEADER="-b cookies.txt"
else
  AUTH_HEADER="-H \"Authorization: Bearer $ACCESS_TOKEN\""
fi

# Create region if it doesn't exist
echo ""
echo "Creating Rwanda region..."
REGION_RESPONSE=$(curl -s -X POST "$API_URL/admin/regions" \
  -H "Content-Type: application/json" \
  -H "x-medusa-access-token: $ACCESS_TOKEN" \
  -d '{
    "name": "Rwanda",
    "currency_code": "rwf",
    "tax_rate": 18,
    "payment_providers": ["manual"],
    "fulfillment_providers": ["manual"],
    "countries": ["rw"]
  }')

REGION_ID=$(echo $REGION_RESPONSE | jq -r '.region.id // empty')
echo "Region response: $REGION_RESPONSE"

# If region creation failed, try to get existing region
if [ -z "$REGION_ID" ]; then
  echo "Getting existing regions..."
  REGIONS_RESPONSE=$(curl -s "$API_URL/admin/regions" \
    -H "x-medusa-access-token: $ACCESS_TOKEN")
  REGION_ID=$(echo $REGIONS_RESPONSE | jq -r '.regions[0].id // empty')
fi

echo "Using region: $REGION_ID"

# Get or create sales channel
echo ""
echo "Getting sales channel..."
SC_RESPONSE=$(curl -s "$API_URL/admin/sales-channels" \
  -H "x-medusa-access-token: $ACCESS_TOKEN")
SALES_CHANNEL_ID=$(echo $SC_RESPONSE | jq -r '.sales_channels[0].id // empty')
echo "Sales channel: $SALES_CHANNEL_ID"

# Get shipping profile
echo ""
echo "Getting shipping profile..."
SP_RESPONSE=$(curl -s "$API_URL/admin/shipping-profiles" \
  -H "x-medusa-access-token: $ACCESS_TOKEN")
SHIPPING_PROFILE_ID=$(echo $SP_RESPONSE | jq -r '.shipping_profiles[0].id // empty')
echo "Shipping profile: $SHIPPING_PROFILE_ID"

# Function to create a product
create_product() {
  local title="$1"
  local handle="$2"
  local description="$3"
  local variant_title="$4"
  local price="$5"
  local inventory="$6"

  echo "Creating: $title..."

  PRODUCT_DATA='{
    "title": "'$title'",
    "handle": "'$handle'",
    "description": "'$description'",
    "is_giftcard": false,
    "status": "published",
    "options": [{"title": "Size"}],
    "variants": [{
      "title": "'$variant_title'",
      "inventory_quantity": '$inventory',
      "manage_inventory": true,
      "options": [{"value": "'$variant_title'"}],
      "prices": [{
        "amount": '$price',
        "currency_code": "rwf"
      }]
    }]
  }'

  RESPONSE=$(curl -s -X POST "$API_URL/admin/products" \
    -H "Content-Type: application/json" \
    -H "x-medusa-access-token: $ACCESS_TOKEN" \
    -d "$PRODUCT_DATA")

  PRODUCT_ID=$(echo $RESPONSE | jq -r '.product.id // empty')

  if [ -n "$PRODUCT_ID" ]; then
    echo "  ✓ Created: $PRODUCT_ID"

    # Add to sales channel
    if [ -n "$SALES_CHANNEL_ID" ]; then
      curl -s -X POST "$API_URL/admin/products/$PRODUCT_ID/sales-channels" \
        -H "Content-Type: application/json" \
        -H "x-medusa-access-token: $ACCESS_TOKEN" \
        -d '{"sales_channel_ids": ["'$SALES_CHANNEL_ID'"]}' > /dev/null
    fi
  else
    ERROR=$(echo $RESPONSE | jq -r '.message // "Unknown error"')
    echo "  ✗ Failed: $ERROR"
  fi
}

echo ""
echo "=== Creating Products ==="
echo ""

# Beverages
create_product "Inyange Water 500ml" "inyange-water-500ml" "Pure natural mineral water from Rwanda's pristine sources" "500ml" 300 500
create_product "Inyange Water 1.5L" "inyange-water-1-5l" "Large bottle of pure natural mineral water" "1.5L" 600 300
create_product "Bralirwa Primus Beer 500ml" "bralirwa-primus-500ml" "Rwanda's favorite lager beer" "500ml" 1200 400
create_product "Bralirwa Mutzig Beer 500ml" "bralirwa-mutzig-500ml" "Premium Rwandan beer with rich taste" "500ml" 1300 350
create_product "Urwagwa Banana Wine 1L" "urwagwa-banana-wine-1l" "Traditional Rwandan banana wine" "1L" 8000 100
create_product "Inyange Apple Juice 1L" "inyange-juice-apple-1l" "100% pure apple juice from Inyange" "1L" 2500 200
create_product "Inyange Passion Fruit Juice 1L" "inyange-juice-passion-1l" "Fresh passion fruit juice" "1L" 2500 200

# Dairy
create_product "Inyange Fresh Milk 500ml" "inyange-milk-500ml" "Fresh pasteurized milk from Rwandan farms" "500ml" 800 300
create_product "Inyange Fresh Milk 1L" "inyange-milk-1l" "Fresh pasteurized milk in 1L packaging" "1L" 1500 250
create_product "Ikivuguto Traditional Yogurt 500ml" "ikivuguto-500ml" "Traditional Rwandan fermented milk" "500ml" 1200 150
create_product "Inyange Strawberry Yogurt 250ml" "inyange-yogurt-strawberry" "Creamy strawberry flavored yogurt" "250ml" 900 200
create_product "Inyange Butter 250g" "inyange-butter-250g" "Pure creamy butter from fresh milk" "250g" 3500 100

# Food & Groceries
create_product "Rice (Local) 5kg" "rice-local-5kg" "Premium Rwandan rice, locally grown" "5kg" 7500 200
create_product "Isombe (Cassava Leaves) 500g" "isombe-500g" "Pre-prepared cassava leaves" "500g" 2000 150
create_product "Ubugari Cassava Flour 2kg" "ubugari-flour-2kg" "Fine cassava flour for ubugari" "2kg" 3500 180
create_product "Red Beans 1kg" "beans-red-1kg" "Premium red kidney beans" "1kg" 2200 250
create_product "Maize Flour 2kg" "maize-flour-2kg" "Fine maize flour for ugali" "2kg" 2800 200
create_product "Sugar 1kg" "sugar-1kg" "Refined white sugar" "1kg" 1800 300
create_product "Ubuki Rwandan Honey 500g" "ubuki-honey-500g" "Pure natural honey from Rwanda" "500g" 12000 80

# Cooking Essentials
create_product "Akabanga Chili Oil 100ml" "akabanga-chili-oil-100ml" "Famous Rwandan hot chili oil" "100ml" 6000 200
create_product "Vegetable Cooking Oil 1L" "vegetable-oil-1l" "Pure vegetable cooking oil" "1L" 4500 250
create_product "Palm Oil 500ml" "palm-oil-500ml" "Traditional palm oil for cooking" "500ml" 3500 150
create_product "Iodized Salt 1kg" "salt-1kg" "Iodized table salt" "1kg" 800 400
create_product "Tomato Paste 400g" "tomato-paste-400g" "Concentrated tomato paste" "400g" 2500 180

# Personal Care
create_product "Geisha Soap Bar 175g" "soap-geisha-175g" "Gentle cleansing soap bar" "175g" 1200 300
create_product "Close Up Toothpaste 100ml" "toothpaste-closeup-100ml" "Fresh breath toothpaste" "100ml" 2000 200
create_product "Body Lotion 400ml" "body-lotion-400ml" "Moisturizing body lotion" "400ml" 5500 120
create_product "OMO Washing Powder 1kg" "washing-powder-1kg" "Powerful cleaning detergent" "1kg" 4000 180

# Gas & Fuel
create_product "LPG Gas Cylinder 6kg Refill" "lpg-gas-6kg-refill" "6kg LPG cooking gas refill" "Refill" 8500 100
create_product "LPG Gas Cylinder 6kg New" "lpg-gas-6kg-new" "6kg LPG with new cylinder" "New Cylinder" 35000 50
create_product "LPG Gas Cylinder 12kg Refill" "lpg-gas-12kg-refill" "12kg LPG cooking gas refill" "Refill" 16500 80
create_product "LPG Gas Cylinder 12kg New" "lpg-gas-12kg-new" "12kg LPG with new cylinder" "New Cylinder" 55000 30
create_product "Charcoal 50kg" "charcoal-50kg" "Premium quality charcoal" "50kg" 25000 60

echo ""
echo "=== Seeding Complete ==="
echo ""

# Verify products
echo "Verifying products..."
PRODUCT_COUNT=$(curl -s "$API_URL/store/products" | jq '.count')
echo "Total products in store: $PRODUCT_COUNT"

rm -f cookies.txt

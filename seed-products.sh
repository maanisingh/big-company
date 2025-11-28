#!/bin/bash

# Big Company Rwanda - Product Seeding Script
# Seeds Rwandan products into Medusa

# Check if Medusa is running
if ! curl -s http://localhost:9001/health > /dev/null; then
  echo "Error: Medusa is not running on port 9001"
  exit 1
fi

echo "=== Seeding Big Company Rwanda Products ==="

# First, create admin user if needed
echo "Creating admin user..."
docker exec bigcompany-medusa npx medusa user -e admin@bigcompany.rw -p Admin123! 2>/dev/null || true

# Get admin JWT token
echo "Getting admin token..."
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:9001/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bigcompany.rw","password":"Admin123!"}')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.user.api_token // empty')
if [ -z "$ADMIN_TOKEN" ]; then
  echo "Using session-based auth..."
  # Use session cookie instead
  COOKIE=$(curl -s -c - -X POST http://localhost:9001/admin/auth \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@bigcompany.rw","password":"Admin123!"}' | grep connect.sid | awk '{print $7}')
  AUTH_HEADER="Cookie: connect.sid=$COOKIE"
else
  AUTH_HEADER="Authorization: Bearer $ADMIN_TOKEN"
fi

# First create or get region
echo "Creating Rwanda region..."
REGION_RESPONSE=$(curl -s -X POST http://localhost:9001/admin/regions \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "name": "Rwanda",
    "currency_code": "rwf",
    "tax_rate": 18,
    "payment_providers": ["manual"],
    "fulfillment_providers": ["manual"],
    "countries": ["rw"]
  }')

REGION_ID=$(echo $REGION_RESPONSE | jq -r '.region.id // empty')
if [ -z "$REGION_ID" ]; then
  # Get existing region
  REGIONS=$(curl -s http://localhost:9001/admin/regions -H "$AUTH_HEADER")
  REGION_ID=$(echo $REGIONS | jq -r '.regions[0].id // empty')
fi
echo "Region ID: $REGION_ID"

# Create sales channel
echo "Creating sales channel..."
SALES_CHANNEL_RESP=$(curl -s -X POST http://localhost:9001/admin/sales-channels \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"name":"Big Company Store","description":"Rwanda FMCG Marketplace"}')

SALES_CHANNEL_ID=$(echo $SALES_CHANNEL_RESP | jq -r '.sales_channel.id // empty')
if [ -z "$SALES_CHANNEL_ID" ]; then
  CHANNELS=$(curl -s http://localhost:9001/admin/sales-channels -H "$AUTH_HEADER")
  SALES_CHANNEL_ID=$(echo $CHANNELS | jq -r '.sales_channels[0].id // empty')
fi
echo "Sales Channel ID: $SALES_CHANNEL_ID"

# Function to create a product
create_product() {
  local title="$1"
  local handle="$2"
  local description="$3"
  local price="$4"
  local option_title="$5"
  local option_value="$6"
  local quantity="$7"

  echo "Creating: $title..."

  PRODUCT_RESP=$(curl -s -X POST http://localhost:9001/admin/products \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d "{
      \"title\": \"$title\",
      \"handle\": \"$handle\",
      \"description\": \"$description\",
      \"is_giftcard\": false,
      \"discountable\": true,
      \"options\": [{\"title\": \"$option_title\"}],
      \"variants\": [{
        \"title\": \"Default\",
        \"prices\": [{\"currency_code\": \"rwf\", \"amount\": $price}],
        \"options\": [{\"value\": \"$option_value\"}],
        \"inventory_quantity\": $quantity,
        \"manage_inventory\": true
      }],
      \"sales_channels\": [{\"id\": \"$SALES_CHANNEL_ID\"}]
    }")

  PROD_ID=$(echo $PRODUCT_RESP | jq -r '.product.id // empty')
  if [ -n "$PROD_ID" ]; then
    echo "  Created: $PROD_ID"
  else
    echo "  Error creating $title"
  fi
}

# BEVERAGES
echo ""
echo "=== BEVERAGES ==="
create_product "Inyange Water 500ml" "inyange-water-500ml" "Pure natural mineral water from Rwanda's pristine sources" 300 "Size" "500ml" 500
create_product "Inyange Water 1.5L" "inyange-water-1-5l" "Large bottle of pure natural mineral water" 600 "Size" "1.5L" 300
create_product "Bralirwa Primus Beer 500ml" "bralirwa-primus-500ml" "Rwanda's favorite lager beer" 1200 "Size" "500ml" 400
create_product "Bralirwa Mutzig Beer 500ml" "bralirwa-mutzig-500ml" "Premium Rwandan beer with rich taste" 1300 "Size" "500ml" 350
create_product "Urwagwa Traditional Banana Wine" "urwagwa-banana-wine-1l" "Traditional Rwandan banana wine" 8000 "Size" "1L" 100
create_product "Inyange Apple Juice" "inyange-juice-apple-1l" "100% pure apple juice" 2500 "Size" "1L" 200
create_product "Inyange Passion Fruit Juice" "inyange-juice-passion-1l" "Delicious passion fruit juice" 2500 "Size" "1L" 200

# DAIRY
echo ""
echo "=== DAIRY ==="
create_product "Inyange Fresh Milk 500ml" "inyange-milk-500ml" "Fresh pasteurized milk from Rwandan dairy farms" 800 "Size" "500ml" 300
create_product "Inyange Fresh Milk 1L" "inyange-milk-1l" "Fresh pasteurized milk in 1 liter packaging" 1500 "Size" "1L" 250
create_product "Ikivuguto (Traditional Yogurt)" "ikivuguto-500ml" "Traditional Rwandan fermented milk" 1200 "Size" "500ml" 150
create_product "Inyange Strawberry Yogurt" "inyange-yogurt-strawberry" "Creamy strawberry flavored yogurt" 900 "Size" "250ml" 200
create_product "Inyange Butter" "inyange-butter-250g" "Pure creamy butter from fresh milk" 3500 "Size" "250g" 100

# FOOD & GROCERIES
echo ""
echo "=== FOOD & GROCERIES ==="
create_product "Rice (Local) 5kg" "rice-local-5kg" "Premium Rwandan rice, locally grown" 7500 "Size" "5kg" 200
create_product "Isombe (Cassava Leaves)" "isombe-500g" "Pre-prepared cassava leaves, traditional delicacy" 2000 "Size" "500g" 150
create_product "Ubugari (Cassava Flour)" "ubugari-flour-2kg" "Fine cassava flour for traditional ubugari" 3500 "Size" "2kg" 180
create_product "Red Beans" "beans-red-1kg" "Premium red kidney beans, staple of Rwandan cuisine" 2200 "Size" "1kg" 250
create_product "Maize Flour" "maize-flour-2kg" "Fine maize flour for ugali and other dishes" 2800 "Size" "2kg" 200
create_product "Sugar" "sugar-1kg" "Refined white sugar" 1800 "Size" "1kg" 300
create_product "Ubuki (Rwandan Honey)" "ubuki-honey-500g" "Pure natural honey from Rwandan beekeepers" 12000 "Size" "500g" 80

# COOKING ESSENTIALS
echo ""
echo "=== COOKING ESSENTIALS ==="
create_product "Akabanga Extra Hot Chili Oil" "akabanga-chili-oil-100ml" "Famous Rwandan hot chili oil" 6000 "Size" "100ml" 200
create_product "Vegetable Cooking Oil" "vegetable-oil-1l" "Pure vegetable cooking oil" 4500 "Size" "1L" 250
create_product "Palm Oil" "palm-oil-500ml" "Traditional palm oil for African cooking" 3500 "Size" "500ml" 150
create_product "Iodized Salt" "salt-1kg" "Iodized table salt" 800 "Size" "1kg" 400
create_product "Tomato Paste" "tomato-paste-400g" "Concentrated tomato paste" 2500 "Size" "400g" 180

# PERSONAL CARE
echo ""
echo "=== PERSONAL CARE ==="
create_product "Geisha Soap Bar" "soap-geisha-175g" "Gentle cleansing soap bar" 1200 "Size" "175g" 300
create_product "Close Up Toothpaste" "toothpaste-closeup-100ml" "Fresh breath toothpaste" 2000 "Size" "100ml" 200
create_product "Moisturizing Body Lotion" "body-lotion-400ml" "Moisturizing body lotion" 5500 "Size" "400ml" 120
create_product "OMO Washing Powder" "washing-powder-1kg" "Powerful cleaning detergent" 4000 "Size" "1kg" 180

# GAS & FUEL
echo ""
echo "=== GAS & FUEL ==="
create_product "LPG Gas Cylinder 6kg Refill" "lpg-gas-6kg-refill" "6kg LPG cooking gas refill" 8500 "Type" "Refill" 100
create_product "LPG Gas Cylinder 6kg New" "lpg-gas-6kg-new" "New 6kg LPG cylinder with gas" 35000 "Type" "New" 50
create_product "LPG Gas Cylinder 12kg Refill" "lpg-gas-12kg-refill" "12kg LPG cooking gas refill" 16500 "Type" "Refill" 80
create_product "LPG Gas Cylinder 12kg New" "lpg-gas-12kg-new" "New 12kg LPG cylinder with gas" 55000 "Type" "New" 30
create_product "Charcoal 50kg" "charcoal-50kg" "Premium quality charcoal for grilling" 25000 "Size" "50kg" 60

echo ""
echo "=== SEEDING COMPLETE ==="
echo ""

# Verify products
PRODUCTS=$(curl -s http://localhost:9001/store/products)
COUNT=$(echo $PRODUCTS | jq -r '.count')
echo "Total products in store: $COUNT"

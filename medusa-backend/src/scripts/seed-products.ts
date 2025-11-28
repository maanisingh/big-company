import { ProductService, RegionService, SalesChannelService, ShippingProfileService, ProductCategoryService } from "@medusajs/medusa";

// Rwanda-specific products for BIG Company
const categories = [
  { name: "Beverages", handle: "beverages", description: "Drinks and refreshments" },
  { name: "Dairy", handle: "dairy", description: "Milk and dairy products" },
  { name: "Food & Groceries", handle: "food-groceries", description: "Food staples and groceries" },
  { name: "Cooking Essentials", handle: "cooking-essentials", description: "Oils, spices, and cooking items" },
  { name: "Personal Care", handle: "personal-care", description: "Hygiene and personal care products" },
  { name: "Gas & Fuel", handle: "gas-fuel", description: "LPG gas cylinders and fuel" },
];

const products = [
  // Beverages
  {
    title: "Inyange Water 500ml",
    handle: "inyange-water-500ml",
    description: "Pure natural mineral water from Rwanda's pristine sources. Refreshing and clean drinking water.",
    category: "beverages",
    variants: [{ title: "Single", prices: [{ amount: 300, currency_code: "rwf" }], inventory_quantity: 500 }],
    thumbnail: "/images/products/inyange-water.jpg",
  },
  {
    title: "Inyange Water 1.5L",
    handle: "inyange-water-1-5l",
    description: "Large bottle of pure natural mineral water. Perfect for families and offices.",
    category: "beverages",
    variants: [{ title: "Single", prices: [{ amount: 600, currency_code: "rwf" }], inventory_quantity: 300 }],
    thumbnail: "/images/products/inyange-water-large.jpg",
  },
  {
    title: "Bralirwa Primus 500ml",
    handle: "bralirwa-primus-500ml",
    description: "Rwanda's favorite lager beer. Brewed locally with the finest ingredients.",
    category: "beverages",
    variants: [{ title: "Single", prices: [{ amount: 1200, currency_code: "rwf" }], inventory_quantity: 400 }],
    thumbnail: "/images/products/primus-beer.jpg",
  },
  {
    title: "Bralirwa Mutzig 500ml",
    handle: "bralirwa-mutzig-500ml",
    description: "Premium Rwandan beer with a rich, full-bodied taste.",
    category: "beverages",
    variants: [{ title: "Single", prices: [{ amount: 1300, currency_code: "rwf" }], inventory_quantity: 350 }],
    thumbnail: "/images/products/mutzig-beer.jpg",
  },
  {
    title: "Urwagwa Traditional Banana Wine 1L",
    handle: "urwagwa-banana-wine-1l",
    description: "Traditional Rwandan banana wine. A cultural favorite for celebrations.",
    category: "beverages",
    variants: [{ title: "Single", prices: [{ amount: 8000, currency_code: "rwf" }], inventory_quantity: 100 }],
    thumbnail: "/images/products/urwagwa.jpg",
  },
  {
    title: "Inyange Juice Apple 1L",
    handle: "inyange-juice-apple-1l",
    description: "100% pure apple juice from Inyange Industries. No added sugar.",
    category: "beverages",
    variants: [{ title: "Single", prices: [{ amount: 2500, currency_code: "rwf" }], inventory_quantity: 200 }],
    thumbnail: "/images/products/inyange-juice-apple.jpg",
  },
  {
    title: "Inyange Juice Passion Fruit 1L",
    handle: "inyange-juice-passion-1l",
    description: "Delicious passion fruit juice. Made from locally grown passion fruits.",
    category: "beverages",
    variants: [{ title: "Single", prices: [{ amount: 2500, currency_code: "rwf" }], inventory_quantity: 200 }],
    thumbnail: "/images/products/inyange-juice-passion.jpg",
  },

  // Dairy
  {
    title: "Inyange Fresh Milk 500ml",
    handle: "inyange-milk-500ml",
    description: "Fresh pasteurized milk from Rwandan dairy farms. Rich in calcium and vitamins.",
    category: "dairy",
    variants: [{ title: "Single", prices: [{ amount: 800, currency_code: "rwf" }], inventory_quantity: 300 }],
    thumbnail: "/images/products/inyange-milk.jpg",
  },
  {
    title: "Inyange Fresh Milk 1L",
    handle: "inyange-milk-1l",
    description: "Fresh pasteurized milk in convenient 1 liter packaging.",
    category: "dairy",
    variants: [{ title: "Single", prices: [{ amount: 1500, currency_code: "rwf" }], inventory_quantity: 250 }],
    thumbnail: "/images/products/inyange-milk-1l.jpg",
  },
  {
    title: "Ikivuguto (Traditional Yogurt) 500ml",
    handle: "ikivuguto-500ml",
    description: "Traditional Rwandan fermented milk. Probiotic-rich and delicious.",
    category: "dairy",
    variants: [{ title: "Single", prices: [{ amount: 1200, currency_code: "rwf" }], inventory_quantity: 150 }],
    thumbnail: "/images/products/ikivuguto.jpg",
  },
  {
    title: "Inyange Yogurt Strawberry 250ml",
    handle: "inyange-yogurt-strawberry",
    description: "Creamy strawberry flavored yogurt. Perfect for breakfast or snacks.",
    category: "dairy",
    variants: [{ title: "Single", prices: [{ amount: 900, currency_code: "rwf" }], inventory_quantity: 200 }],
    thumbnail: "/images/products/inyange-yogurt.jpg",
  },
  {
    title: "Inyange Butter 250g",
    handle: "inyange-butter-250g",
    description: "Pure creamy butter made from fresh Rwandan milk.",
    category: "dairy",
    variants: [{ title: "Single", prices: [{ amount: 3500, currency_code: "rwf" }], inventory_quantity: 100 }],
    thumbnail: "/images/products/inyange-butter.jpg",
  },

  // Food & Groceries
  {
    title: "Rice (Local) 5kg",
    handle: "rice-local-5kg",
    description: "Premium Rwandan rice. Locally grown and harvested.",
    category: "food-groceries",
    variants: [{ title: "5kg Bag", prices: [{ amount: 7500, currency_code: "rwf" }], inventory_quantity: 200 }],
    thumbnail: "/images/products/rice.jpg",
  },
  {
    title: "Isombe (Cassava Leaves) 500g",
    handle: "isombe-500g",
    description: "Pre-prepared cassava leaves. Traditional Rwandan delicacy.",
    category: "food-groceries",
    variants: [{ title: "500g Pack", prices: [{ amount: 2000, currency_code: "rwf" }], inventory_quantity: 150 }],
    thumbnail: "/images/products/isombe.jpg",
  },
  {
    title: "Ubugari (Cassava Flour) 2kg",
    handle: "ubugari-flour-2kg",
    description: "Fine cassava flour for making traditional ubugari.",
    category: "food-groceries",
    variants: [{ title: "2kg Bag", prices: [{ amount: 3500, currency_code: "rwf" }], inventory_quantity: 180 }],
    thumbnail: "/images/products/ubugari-flour.jpg",
  },
  {
    title: "Beans (Red) 1kg",
    handle: "beans-red-1kg",
    description: "Premium red kidney beans. Staple of Rwandan cuisine.",
    category: "food-groceries",
    variants: [{ title: "1kg Bag", prices: [{ amount: 2200, currency_code: "rwf" }], inventory_quantity: 250 }],
    thumbnail: "/images/products/beans-red.jpg",
  },
  {
    title: "Maize Flour 2kg",
    handle: "maize-flour-2kg",
    description: "Fine maize flour for ugali and other dishes.",
    category: "food-groceries",
    variants: [{ title: "2kg Bag", prices: [{ amount: 2800, currency_code: "rwf" }], inventory_quantity: 200 }],
    thumbnail: "/images/products/maize-flour.jpg",
  },
  {
    title: "Sugar 1kg",
    handle: "sugar-1kg",
    description: "Refined white sugar. Essential kitchen staple.",
    category: "food-groceries",
    variants: [{ title: "1kg Bag", prices: [{ amount: 1800, currency_code: "rwf" }], inventory_quantity: 300 }],
    thumbnail: "/images/products/sugar.jpg",
  },
  {
    title: "Ubuki (Rwandan Honey) 500g",
    handle: "ubuki-honey-500g",
    description: "Pure natural honey from Rwandan beekeepers. Rich and flavorful.",
    category: "food-groceries",
    variants: [{ title: "500g Jar", prices: [{ amount: 12000, currency_code: "rwf" }], inventory_quantity: 80 }],
    thumbnail: "/images/products/ubuki-honey.jpg",
  },

  // Cooking Essentials
  {
    title: "Akabanga Extra Hot Chili Oil 100ml",
    handle: "akabanga-chili-oil-100ml",
    description: "Famous Rwandan hot chili oil. A little goes a long way!",
    category: "cooking-essentials",
    variants: [{ title: "100ml Bottle", prices: [{ amount: 6000, currency_code: "rwf" }], inventory_quantity: 200 }],
    thumbnail: "/images/products/akabanga.jpg",
  },
  {
    title: "Vegetable Oil 1L",
    handle: "vegetable-oil-1l",
    description: "Pure vegetable cooking oil. For all your cooking needs.",
    category: "cooking-essentials",
    variants: [{ title: "1L Bottle", prices: [{ amount: 4500, currency_code: "rwf" }], inventory_quantity: 250 }],
    thumbnail: "/images/products/vegetable-oil.jpg",
  },
  {
    title: "Palm Oil 500ml",
    handle: "palm-oil-500ml",
    description: "Traditional palm oil for authentic African cooking.",
    category: "cooking-essentials",
    variants: [{ title: "500ml Bottle", prices: [{ amount: 3500, currency_code: "rwf" }], inventory_quantity: 150 }],
    thumbnail: "/images/products/palm-oil.jpg",
  },
  {
    title: "Salt 1kg",
    handle: "salt-1kg",
    description: "Iodized table salt. Essential for every kitchen.",
    category: "cooking-essentials",
    variants: [{ title: "1kg Pack", prices: [{ amount: 800, currency_code: "rwf" }], inventory_quantity: 400 }],
    thumbnail: "/images/products/salt.jpg",
  },
  {
    title: "Tomato Paste 400g",
    handle: "tomato-paste-400g",
    description: "Concentrated tomato paste for rich sauces and stews.",
    category: "cooking-essentials",
    variants: [{ title: "400g Tin", prices: [{ amount: 2500, currency_code: "rwf" }], inventory_quantity: 180 }],
    thumbnail: "/images/products/tomato-paste.jpg",
  },

  // Personal Care
  {
    title: "Soap Bar (Geisha) 175g",
    handle: "soap-geisha-175g",
    description: "Gentle cleansing soap bar. For smooth, healthy skin.",
    category: "personal-care",
    variants: [{ title: "Single Bar", prices: [{ amount: 1200, currency_code: "rwf" }], inventory_quantity: 300 }],
    thumbnail: "/images/products/soap-geisha.jpg",
  },
  {
    title: "Toothpaste (Close Up) 100ml",
    handle: "toothpaste-closeup-100ml",
    description: "Fresh breath toothpaste for complete oral care.",
    category: "personal-care",
    variants: [{ title: "100ml Tube", prices: [{ amount: 2000, currency_code: "rwf" }], inventory_quantity: 200 }],
    thumbnail: "/images/products/toothpaste.jpg",
  },
  {
    title: "Body Lotion 400ml",
    handle: "body-lotion-400ml",
    description: "Moisturizing body lotion for soft, hydrated skin.",
    category: "personal-care",
    variants: [{ title: "400ml Bottle", prices: [{ amount: 5500, currency_code: "rwf" }], inventory_quantity: 120 }],
    thumbnail: "/images/products/body-lotion.jpg",
  },
  {
    title: "Washing Powder 1kg",
    handle: "washing-powder-1kg",
    description: "Powerful cleaning detergent for sparkling clean clothes.",
    category: "personal-care",
    variants: [{ title: "1kg Pack", prices: [{ amount: 4000, currency_code: "rwf" }], inventory_quantity: 180 }],
    thumbnail: "/images/products/washing-powder.jpg",
  },

  // Gas & Fuel
  {
    title: "LPG Gas Cylinder 6kg",
    handle: "lpg-gas-6kg",
    description: "6kg LPG cooking gas cylinder. Safe and efficient for home cooking.",
    category: "gas-fuel",
    variants: [
      { title: "Refill Only", prices: [{ amount: 8500, currency_code: "rwf" }], inventory_quantity: 100 },
      { title: "New Cylinder + Gas", prices: [{ amount: 35000, currency_code: "rwf" }], inventory_quantity: 50 },
    ],
    thumbnail: "/images/products/lpg-6kg.jpg",
  },
  {
    title: "LPG Gas Cylinder 12kg",
    handle: "lpg-gas-12kg",
    description: "12kg LPG cooking gas cylinder. Ideal for families and restaurants.",
    category: "gas-fuel",
    variants: [
      { title: "Refill Only", prices: [{ amount: 16500, currency_code: "rwf" }], inventory_quantity: 80 },
      { title: "New Cylinder + Gas", prices: [{ amount: 55000, currency_code: "rwf" }], inventory_quantity: 30 },
    ],
    thumbnail: "/images/products/lpg-12kg.jpg",
  },
  {
    title: "Charcoal 50kg",
    handle: "charcoal-50kg",
    description: "Premium quality charcoal for grilling and cooking.",
    category: "gas-fuel",
    variants: [{ title: "50kg Bag", prices: [{ amount: 25000, currency_code: "rwf" }], inventory_quantity: 60 }],
    thumbnail: "/images/products/charcoal.jpg",
  },
];

export default async function seedProducts(container: any) {
  console.log("Starting product seeding for BIG Company Rwanda...");

  const productService: ProductService = container.resolve("productService");
  const regionService: RegionService = container.resolve("regionService");
  const salesChannelService: SalesChannelService = container.resolve("salesChannelService");
  const shippingProfileService: ShippingProfileService = container.resolve("shippingProfileService");

  try {
    // Get or create Rwanda region
    let regions = await regionService.list({});
    let rwandaRegion = regions.find((r) => r.name === "Rwanda");

    if (!rwandaRegion) {
      console.log("Creating Rwanda region...");
      rwandaRegion = await regionService.create({
        name: "Rwanda",
        currency_code: "rwf",
        tax_rate: 18, // VAT in Rwanda
        payment_providers: ["manual"],
        fulfillment_providers: ["manual"],
        countries: ["rw"],
      });
    }
    console.log(`Using region: ${rwandaRegion.name} (${rwandaRegion.id})`);

    // Get default sales channel
    const salesChannels = await salesChannelService.list({});
    const defaultChannel = salesChannels[0];
    console.log(`Using sales channel: ${defaultChannel?.name || 'default'}`);

    // Get default shipping profile
    const shippingProfiles = await shippingProfileService.list({});
    const defaultProfile = shippingProfiles.find((p) => p.type === "default") || shippingProfiles[0];
    console.log(`Using shipping profile: ${defaultProfile?.name || 'default'}`);

    // Create products
    let created = 0;
    let skipped = 0;

    for (const productData of products) {
      try {
        // Check if product already exists
        const existing = await productService.list({ handle: productData.handle });
        if (existing.length > 0) {
          console.log(`Skipping existing product: ${productData.title}`);
          skipped++;
          continue;
        }

        const product = await productService.create({
          title: productData.title,
          handle: productData.handle,
          description: productData.description,
          is_giftcard: false,
          status: "published",
          thumbnail: productData.thumbnail,
          profile_id: defaultProfile?.id,
          options: [{ title: "Size" }],
          variants: productData.variants.map((v) => ({
            title: v.title,
            inventory_quantity: v.inventory_quantity,
            manage_inventory: true,
            prices: v.prices.map((p) => ({
              amount: p.amount,
              currency_code: p.currency_code,
              region_id: rwandaRegion!.id,
            })),
          })),
        });

        // Add to sales channel
        if (defaultChannel) {
          await productService.update(product.id, {
            sales_channels: [{ id: defaultChannel.id }],
          });
        }

        console.log(`✓ Created: ${productData.title}`);
        created++;
      } catch (error: any) {
        console.error(`✗ Failed to create ${productData.title}: ${error.message}`);
      }
    }

    console.log(`\n=== Seeding Complete ===`);
    console.log(`Created: ${created} products`);
    console.log(`Skipped: ${skipped} existing products`);
    console.log(`Total: ${products.length} products`);

  } catch (error: any) {
    console.error("Seeding failed:", error.message);
    throw error;
  }
}

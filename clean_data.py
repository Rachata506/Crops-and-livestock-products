"""Cleans the raw FAOSTAT export into a tidy CSV (cleaned_data.csv) for the D3 page.
Usage: python prepare_data.py data.csv"""
import sys, pandas as pd

SRC = sys.argv[1] if len(sys.argv) > 1 else "/data.csv"
YEARS = list(range(1961, 2025)); YCOLS = [f"Y{y}" for y in YEARS]
GROUPS = ["Cereals, primary", "Vegetables Primary", "Fruit Primary", "Roots and Tubers, Total", "Sugar Crops Primary", "Pulses, Total"]
CROPS = ["Sugar cane", "Maize (corn)", "Wheat", "Rice", "Potatoes", "Soya beans", "Cassava, fresh", "Sugar beet", "Oil palm fruit",
         "Tomatoes", "Bananas", "Barley", "Sweet potatoes", "Grapes", "Apples", "Oranges", "Sorghum", "Watermelons", "Coconuts, in shell",
         "Seed cotton, unginned", "Rape or colza seed", "Sunflower seed", "Onions and shallots, dry (excluding dehydrated)", "Cabbages",
         "Millet", "Oats", "Yams", "Groundnuts, excluding shelled", "Plantains and cooking bananas"]
AREAS = {5000: ("World", "World"), 5100: ("Africa", "Continent"), 5200: ("Americas", "Continent"), 5300: ("Asia", "Continent"),
         5400: ("Europe", "Continent"), 5500: ("Oceania", "Continent")}

df = pd.read_csv(SRC, usecols=["Area Code", "Item", "Element", "Unit"] + YCOLS)
df = df[(df.Element == "Production") & (df.Unit == "t") & df["Area Code"].isin(AREAS) & df.Item.isin(GROUPS + CROPS)]
long = df.melt(id_vars=["Area Code", "Item"], value_vars=YCOLS, var_name="Year", value_name="Production_t")
long["Year"] = long.Year.str[1:].astype(int)
long["Production_t"] = long.Production_t.fillna(0).round(1)
long["Area"] = long["Area Code"].map(lambda c: AREAS[c][0]); long["Area_Type"] = long["Area Code"].map(lambda c: AREAS[c][1])
long["Item_Type"] = long.Item.map(lambda i: "Group" if i in GROUPS else "Crop")
long["o"] = long.Item.map({n: i for i, n in enumerate(GROUPS + CROPS)}); long["a"] = long["Area Code"]
long = long.sort_values(["a", "o", "Year"])[["Area", "Area_Type", "Item", "Item_Type", "Year", "Production_t"]]
long.to_csv("cleaned_data.csv", index=False)
# Fallback so the page also works when opened by double-click (browsers block fetch() on file://)
open("cleaned_data.js", "w").write("window.CLEAN_CSV = " + __import__("json").dumps(open("cleaned_data.csv").read()) + ";\n")
print(len(long), "rows")
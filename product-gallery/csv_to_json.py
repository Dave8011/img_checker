import csv
import json

with open('products.csv', 'r') as csvfile:
    reader = csv.DictReader(csvfile)
    products = []
    for row in reader:
        images = [row[k] for k in row if k.startswith("image") and row[k]]
        products.append({
            "sku": row["sku"],
            "title": row["title"],
            "images": images
        })

with open('products.json', 'w') as jsonfile:
    json.dump(products, jsonfile, indent=2)

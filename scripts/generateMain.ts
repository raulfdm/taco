import csv from 'csvtojson';
import path from 'path';
import fs from 'fs';

const mainFile = csv().fromFile(
  path.resolve(
    __dirname,
    '../references/exported/Taco_4a_edicao_2011_formatted-main.csv'
  )
);

const aminoFile = csv().fromFile(
  path.resolve(
    __dirname,
    '../references/exported/Taco_4a_edicao_2011_formatted-aminoacids.csv'
  )
);

const agFile = csv().fromFile(
  path.resolve(
    __dirname,
    '../references/exported/Taco_4a_edicao_2011_formatted-ag.csv'
  )
);

Promise.all([mainFile, aminoFile, agFile])
  .then(([foods, aminoacids, ags]: Hash[][]) => {
    const foodDictionary = new Map();

    for (const food of foods) {
      const parsedFood = sanitizeProperties(food);
      foodDictionary.set(parsedFood.id, parsedFood);
    }

    for (const aminoacid of aminoacids) {
      const parsedAmino = sanitizeProperties(aminoacid);
      const food = foodDictionary.get(parsedAmino.id);
      food.nutrients.push(...parsedAmino.nutrients);
      foodDictionary.set(parsedAmino.id, food);
    }

    for (const ag of ags) {
      const parsedAg = sanitizeProperties(ag);
      const food = foodDictionary.get(parsedAg.id);
      food.nutrients.push(...parsedAg.nutrients);
      foodDictionary.set(parsedAg.id, food);
    }

    return foodDictionary;
  })
  .then((foodDictionary) => {
    // console.log(foodDictionary.values());
    const a = Array.from(foodDictionary.values());

    console.log(a);

    fs.writeFileSync('./generated.json', JSON.stringify(a, null, 2));
  });

type Nutrient = { qty: string; unit: string; nutrient: string };
type Nutrients = (Nutrient | string)[];

type Hash = {
  [key: string]: string;
};

type HashResult = {
  [key: string]: string | Nutrients;
};

function sanitizeProperties(obj: Hash): HashResult {
  const keys = Object.keys(obj);

  const result: HashResult = {
    nutrients: [],
  };

  const rootKeys = ['id', 'description', 'category'];

  for (const key of keys) {
    if (rootKeys.includes(key)) {
      result[key] = obj[key];
    } else {
      /**
       * From (mg) to {result: mg, match: (mg)}
       */
      const sanitizedUnit = getUnit(key);

      if (!sanitizedUnit) {
        result[key] = obj[key];
        continue;
      }

      /**
       * Need to remove unit from the key:
       * Humidity (mg) => Humidity
       */
      const sanitizedKey = key
        .replace(sanitizedUnit.match, '')
        .toLowerCase()
        .trim();

      (result.nutrients as Nutrients).push({
        nutrient: sanitizedKey,
        unit: sanitizedUnit.result,
        qty: obj[key],
      });
    }
  }

  return result;
}

function getUnit(
  labelWithUnit: string
): { result: string; match: string } | undefined {
  const unitRegex = /\((.*)\)/gi;

  const labelMatch = labelWithUnit.match(unitRegex);

  if (!labelMatch) {
    return;
  }

  const [unitWithParams] = labelMatch;

  const sanitizedUnit = unitWithParams
    .replace('(', '')
    .replace(')', '')
    .toLowerCase();

  return { result: sanitizedUnit, match: unitWithParams };
}

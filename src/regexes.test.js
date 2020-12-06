const regexes = require("./regexes");

const times = [
  ["popping ony at 1800", ["1800"]],
  ["popping ony at 18:00", ["18:00"]],
  ["popping ony at 18.00", ["18.00"]],
  ["popping ony at 18", ["18"]],
  ["popping ony at 800", ["800"]],
  ["popping ony at 8:00", ["8:00"]],
  ["popping ony at 8.00", ["8.00"]],
  ["popping ony at 8", ["8"]],
  ["popping ony at 0800", ["0800"]],
  ["popping ony at 08:00", ["08:00"]],
  ["popping ony at 08.00", ["08.00"]],
  ["popping ony at 08", ["08"]],
  ["popping ony", null],
  ["popping ony at reset", null],
];

test.each(times)("check '%s' for time", (input, expected) => {
  expect(input.match(regexes.time)).toStrictEqual(expected);
});

const buffs = [
  ["popping ony at 1800", ["ony"]],
  ["popping Ony at 1800", ["Ony"]],
  ["popping ONY at 1800", ["ONY"]],
  ["popping Onyxia at 1800", ["Onyxia"]],
  ["popping nef at 1800", ["nef"]],
  ["popping Nef at 1800", ["Nef"]],
  ["popping NEF at 1800", ["NEF"]],
  ["popping Nefarian at 1800", ["Nefarian"]],
  ["popping rend at 1800", ["rend"]],
  ["popping Rend at 1800", ["Rend"]],
  ["popping REND at 1800", ["REND"]],
  ["popping hakkar at 1800", ["hakkar"]],
  ["popping Hakkar at 1800", ["Hakkar"]],
  ["popping HAKKAR at 1800", ["HAKKAR"]],
];

test.each(buffs)("check '%s' for buff", (input, expected) => {
  expect(input.match(regexes.buff)).toStrictEqual(expected);
});

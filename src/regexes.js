const buffRegex = RegExp(/onyxia|ony|nefarian|nef|hakkar|hoh|heart|rend/, "gi");
const timeRegex = RegExp(/\d{1,2}[:.]?\d{2}|\d{1,2}/, "g");

module.exports = { buff: buffRegex, time: timeRegex };

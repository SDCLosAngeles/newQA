const randomProductId = function() {
  // generate a random integer between 1 and 1,000,000
  const max= 1000001;
  const min = 1;

  product_id = Math.floor(Math.random() * (max - min) + min);

  return product_id;
}

randomProductId();
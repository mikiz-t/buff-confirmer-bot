
exports.up = function(knex) {
  return knex.schema
    .createTable('buff_messages', function(table) {
       table.increments('id');
       table.string('message_id', 255).notNullable();
       table.timestamps(false, true);
    });
};

exports.down = function(knex) {
  return knex.schema.dropTable('buff_messages');
};

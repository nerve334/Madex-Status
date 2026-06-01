exports.up = function (knex) {
    return knex.schema.alterTable("status_page", function (table) {
        table.string("monitor_pin", 4).nullable().defaultTo(null);
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable("status_page", function (table) {
        table.dropColumn("monitor_pin");
    });
};

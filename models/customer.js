"use strict";

/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           ORDER BY last_name, first_name`,
    );
    return results.rows.map(c => new Customer(c));
  }

  /** find search customers */

  // static async search(searchTerm) {
  //   console.log(searchTerm)
  //   const results = await db.query(
  //     `SELECT id,
  //                 first_name AS "firstName",
  //                 last_name  AS "lastName",
  //                 phone,
  //                 notes
  //          FROM customers
  //          WHERE first_name ILIKE '%'||$1||'%' OR last_name ILIKE '%'||$1||'%'
  //          ORDER BY last_name, first_name`,
  //     [searchTerm]
  //   );
  //   return results.rows.map(c => new Customer(c));
  // }

  static async search(searchTerm) {
    const search = searchTerm.toLowerCase();
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           ORDER BY last_name, first_name`
    );
    const customers = results.rows.map(c => new Customer(c));
    const searchedCustomers = customers.filter(c => c.fullName().toLowerCase().includes(search));
    return searchedCustomers;
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE id = $1`,
      [id],
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  static async bestCustomers(amt) {
    const results = await db.query(
      `SELECT c.id,
            c.first_name AS "firstName",
            c.last_name  AS "lastName",
            c.phone,
            c.notes,
            COUNT(customer_id) AS res_amt
      FROM customers AS c
      JOIN reservations AS r ON c.id = r.customer_id
      GROUP BY c.id, c.last_name, c.first_name, phone, c.notes 
      ORDER BY res_amt DESC 
      LIMIT $1`, [amt]
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get customer full name */

  get fullName() {
    let fullName = `${this.firstName} ${this.lastName}`;
    return fullName;
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes],
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers
             SET first_name=$1,
                 last_name=$2,
                 phone=$3,
                 notes=$4
             WHERE id = $5`, [
        this.firstName,
        this.lastName,
        this.phone,
        this.notes,
        this.id,
      ],
      );
    }
  }
}

module.exports = Customer;

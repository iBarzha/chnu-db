-- Sample Database for SQL Editor
-- This SQL dump creates a comprehensive database with multiple tables and relationships
-- It includes various data types and sample data for testing and learning SQL queries

-- Create tables for an e-commerce database

-- Customers table
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(200),
    city VARCHAR(50),
    country VARCHAR(50),
    postal_code VARCHAR(20),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product categories
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL,
    description TEXT
);

-- Products table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    category_id INTEGER REFERENCES categories(category_id),
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE
);

-- Orders table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(customer_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')) DEFAULT 'Pending'
);

-- Order items (order details)
CREATE TABLE order_items (
    item_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id),
    product_id INTEGER REFERENCES products(product_id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Product reviews
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(product_id),
    customer_id INTEGER REFERENCES customers(customer_id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hire_date DATE NOT NULL,
    job_title VARCHAR(50) NOT NULL,
    department VARCHAR(50),
    salary DECIMAL(10, 2),
    manager_id INTEGER REFERENCES employees(employee_id)
);

-- Insert sample data

-- Insert categories
INSERT INTO categories (category_name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Clothing', 'Apparel and fashion items'),
('Books', 'Books, e-books, and publications'),
('Home & Kitchen', 'Home appliances and kitchen items'),
('Sports & Outdoors', 'Sports equipment and outdoor gear');

-- Insert products
INSERT INTO products (product_name, category_id, price, description, stock_quantity) VALUES
('Smartphone X', 1, 799.99, 'Latest smartphone with advanced features', 50),
('Laptop Pro', 1, 1299.99, 'High-performance laptop for professionals', 30),
('Wireless Headphones', 1, 149.99, 'Noise-cancelling wireless headphones', 100),
('T-shirt Basic', 2, 19.99, 'Cotton basic t-shirt', 200),
('Jeans Classic', 2, 49.99, 'Classic blue jeans', 150),
('SQL Programming Guide', 3, 34.99, 'Comprehensive guide to SQL programming', 75),
('Coffee Maker', 4, 89.99, 'Automatic coffee maker with timer', 40),
('Blender Pro', 4, 69.99, 'High-speed blender for smoothies and more', 25),
('Yoga Mat', 5, 29.99, 'Non-slip yoga mat', 80),
('Tennis Racket', 5, 119.99, 'Professional tennis racket', 15);

-- Insert customers
INSERT INTO customers (first_name, last_name, email, phone, address, city, country, postal_code) VALUES
('John', 'Doe', 'john.doe@example.com', '555-123-4567', '123 Main St', 'New York', 'USA', '10001'),
('Jane', 'Smith', 'jane.smith@example.com', '555-987-6543', '456 Oak Ave', 'Los Angeles', 'USA', '90001'),
('Michael', 'Johnson', 'michael.johnson@example.com', '555-456-7890', '789 Pine Rd', 'Chicago', 'USA', '60007'),
('Emily', 'Brown', 'emily.brown@example.com', '555-321-6547', '101 Maple Dr', 'Houston', 'USA', '77001'),
('David', 'Wilson', 'david.wilson@example.com', '555-789-1234', '202 Cedar Ln', 'Miami', 'USA', '33101'),
('Sarah', 'Taylor', 'sarah.taylor@example.com', '555-654-9870', '303 Birch Blvd', 'Seattle', 'USA', '98101'),
('Robert', 'Anderson', 'robert.anderson@example.com', '555-258-3690', '404 Elm St', 'Boston', 'USA', '02101'),
('Jennifer', 'Thomas', 'jennifer.thomas@example.com', '555-147-2583', '505 Walnut Ave', 'San Francisco', 'USA', '94101'),
('William', 'Jackson', 'william.jackson@example.com', '555-369-1470', '606 Cherry Rd', 'Denver', 'USA', '80201'),
('Elizabeth', 'White', 'elizabeth.white@example.com', '555-741-8520', '707 Spruce Dr', 'Phoenix', 'USA', '85001');

-- Insert orders
INSERT INTO orders (customer_id, order_date, total_amount, status) VALUES
(1, '2023-01-15 10:30:00', 849.98, 'Delivered'),
(2, '2023-01-20 14:45:00', 149.99, 'Delivered'),
(3, '2023-02-05 09:15:00', 1299.99, 'Shipped'),
(4, '2023-02-10 16:20:00', 89.99, 'Delivered'),
(5, '2023-03-01 11:00:00', 69.98, 'Delivered'),
(1, '2023-03-15 13:30:00', 149.99, 'Processing'),
(2, '2023-04-02 15:45:00', 34.99, 'Shipped'),
(6, '2023-04-10 10:10:00', 119.99, 'Pending'),
(7, '2023-04-15 14:20:00', 1299.99, 'Processing'),
(8, '2023-04-20 09:30:00', 29.99, 'Pending');

-- Insert order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 799.99),
(1, 4, 2, 19.99),
(2, 3, 1, 149.99),
(3, 2, 1, 1299.99),
(4, 7, 1, 89.99),
(5, 4, 1, 19.99),
(5, 6, 1, 34.99),
(6, 3, 1, 149.99),
(7, 6, 1, 34.99),
(8, 10, 1, 119.99),
(9, 2, 1, 1299.99),
(10, 9, 1, 29.99);

-- Insert reviews
INSERT INTO reviews (product_id, customer_id, rating, comment) VALUES
(1, 1, 5, 'Great smartphone, very fast and excellent camera!'),
(1, 3, 4, 'Good phone but battery life could be better'),
(2, 5, 5, 'Excellent laptop for work and gaming'),
(3, 2, 5, 'Best headphones I have ever owned'),
(3, 4, 4, 'Good sound quality but a bit uncomfortable after long use'),
(4, 6, 3, 'Average quality t-shirt'),
(5, 7, 4, 'Good fit and comfortable'),
(6, 8, 5, 'Very informative book, helped me learn SQL'),
(7, 9, 4, 'Makes great coffee but a bit noisy'),
(8, 10, 5, 'Powerful blender, perfect for smoothies');

-- Insert employees
INSERT INTO employees (first_name, last_name, email, hire_date, job_title, department, salary, manager_id) VALUES
('James', 'Clark', 'james.clark@company.com', '2020-01-15', 'CEO', 'Executive', 150000.00, NULL),
('Patricia', 'Lewis', 'patricia.lewis@company.com', '2020-02-20', 'CTO', 'Executive', 140000.00, 1),
('Richard', 'Walker', 'richard.walker@company.com', '2020-03-10', 'CFO', 'Executive', 140000.00, 1),
('Linda', 'Hall', 'linda.hall@company.com', '2020-04-05', 'HR Manager', 'Human Resources', 90000.00, 1),
('Thomas', 'Young', 'thomas.young@company.com', '2020-05-12', 'IT Manager', 'IT', 95000.00, 2),
('Barbara', 'Allen', 'barbara.allen@company.com', '2020-06-15', 'Marketing Manager', 'Marketing', 85000.00, 1),
('Charles', 'Scott', 'charles.scott@company.com', '2021-01-10', 'Sales Manager', 'Sales', 80000.00, 1),
('Susan', 'Green', 'susan.green@company.com', '2021-02-15', 'IT Specialist', 'IT', 75000.00, 5),
('Joseph', 'Baker', 'joseph.baker@company.com', '2021-03-20', 'HR Specialist', 'Human Resources', 65000.00, 4),
('Margaret', 'Nelson', 'margaret.nelson@company.com', '2021-04-25', 'Marketing Specialist', 'Marketing', 60000.00, 6),
('Daniel', 'Carter', 'daniel.carter@company.com', '2021-05-10', 'Sales Representative', 'Sales', 55000.00, 7),
('Nancy', 'Mitchell', 'nancy.mitchell@company.com', '2021-06-15', 'IT Support', 'IT', 50000.00, 5);

-- Create some useful views

-- Customer orders summary
CREATE VIEW customer_orders_summary AS
SELECT 
    c.customer_id,
    c.first_name || ' ' || c.last_name AS customer_name,
    COUNT(o.order_id) AS total_orders,
    SUM(o.total_amount) AS total_spent,
    MAX(o.order_date) AS last_order_date
FROM 
    customers c
LEFT JOIN 
    orders o ON c.customer_id = o.customer_id
GROUP BY 
    c.customer_id, customer_name
ORDER BY 
    total_spent DESC;

-- Product sales summary
CREATE VIEW product_sales_summary AS
SELECT 
    p.product_id,
    p.product_name,
    c.category_name,
    SUM(oi.quantity) AS total_quantity_sold,
    SUM(oi.quantity * oi.unit_price) AS total_revenue,
    COUNT(DISTINCT o.customer_id) AS unique_customers,
    ROUND(AVG(r.rating), 2) AS average_rating
FROM 
    products p
LEFT JOIN 
    categories c ON p.category_id = c.category_id
LEFT JOIN 
    order_items oi ON p.product_id = oi.product_id
LEFT JOIN 
    orders o ON oi.order_id = o.order_id
LEFT JOIN 
    reviews r ON p.product_id = r.product_id
GROUP BY 
    p.product_id, p.product_name, c.category_name
ORDER BY 
    total_revenue DESC;

-- Employee hierarchy
CREATE VIEW employee_hierarchy AS
WITH RECURSIVE emp_hierarchy AS (
    -- Base case: employees with no manager (top level)
    SELECT 
        employee_id, 
        first_name || ' ' || last_name AS employee_name,
        job_title,
        department,
        salary,
        manager_id,
        0 AS level,
        ARRAY[employee_id] AS path
    FROM 
        employees
    WHERE 
        manager_id IS NULL
    
    UNION ALL
    
    -- Recursive case: employees with managers
    SELECT 
        e.employee_id,
        e.first_name || ' ' || e.last_name AS employee_name,
        e.job_title,
        e.department,
        e.salary,
        e.manager_id,
        eh.level + 1,
        eh.path || e.employee_id
    FROM 
        employees e
    JOIN 
        emp_hierarchy eh ON e.manager_id = eh.employee_id
)
SELECT 
    employee_id,
    employee_name,
    job_title,
    department,
    salary,
    manager_id,
    level,
    REPEAT('    ', level) || employee_name AS hierarchical_name
FROM 
    emp_hierarchy
ORDER BY 
    path;
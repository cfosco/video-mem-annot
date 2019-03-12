CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  worker_id VARCHAR(255) UNIQUE NOT NULL,
  num_lives INT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS videos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  uri VARCHAR(255) UNIQUE NOT NULL,
  labels INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS levels (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_user INT NOT NULL,
  assignment_id VARCHAR(255),
  hit_id VARCHAR(255),
  inputs_hash VARCHAR(64),
  FOREIGN KEY(id_user) REFERENCES users(id),
  score DECIMAL(10,9),
  vig_score DECIMAL(10, 9),
  false_pos_rate DECIMAL(10, 9),
  reward DECIMAL(4,2),
  insert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_msec INT,
  feedback TEXT
);

CREATE TABLE IF NOT EXISTS presentations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_level INT NOT NULL,
  FOREIGN KEY(id_level) REFERENCES levels(id),
  id_video INT NOT NULL,
  FOREIGN KEY(id_video) REFERENCES videos(id),
  position INT NOT NULL,
  vigilance BOOLEAN NOT NULL,
  targeted BOOLEAN NOT NULL,
  duplicate BOOLEAN NOT NULL,
  response BOOLEAN,
  start_msec INT,
  duration_msec INT
);

CREATE TABLE IF NOT EXISTS errors (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_presentation INT NOT NULL,
  FOREIGN KEY(id_presentation) REFERENCES presentations(id),
  e_code INT,
  e_text TEXT,
  e_where TEXT
)
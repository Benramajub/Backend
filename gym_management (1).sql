-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 10, 2025 at 04:01 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `gym_management`
--

-- --------------------------------------------------------

--
-- Table structure for table `dailymembers`
--

CREATE TABLE `dailymembers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `code` varchar(4) NOT NULL,
  `uses_remaining` int(11) DEFAULT 2,
  `date` date NOT NULL DEFAULT curdate()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `dailymembers`
--

INSERT INTO `dailymembers` (`id`, `name`, `amount`, `code`, `uses_remaining`, `date`) VALUES
(1, 'เบน', 100.00, '2144', 2, '2025-02-04'),
(2, 'Narongrit', 100.00, '4047', 2, '2025-02-08');

-- --------------------------------------------------------

--
-- Table structure for table `fingerprints`
--

CREATE TABLE `fingerprints` (
  `id` int(11) NOT NULL,
  `fingerprint_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `fingerprints`
--

INSERT INTO `fingerprints` (`id`, `fingerprint_id`, `member_id`, `created_at`) VALUES
(94, 1, 170, '2025-02-07 20:35:05'),
(95, 2, 171, '2025-02-07 20:44:02');

-- --------------------------------------------------------

--
-- Table structure for table `members`
--

CREATE TABLE `members` (
  `id` int(11) NOT NULL PRIMARY KEY,
  `firstName` varchar(50) DEFAULT NULL,
  `lastName` varchar(50) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `originalPrice` decimal(10,2) DEFAULT NULL,
  `points` int(11) DEFAULT NULL,
  `discount` decimal(5,2) DEFAULT NULL,
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `hasFingerprint` tinyint(1) DEFAULT 0,
  `fingerprint_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `members`
--

INSERT INTO `members` (`id`, `firstName`, `lastName`, `age`, `phone`, `email`, `duration`, `originalPrice`, `points`, `discount`, `startDate`, `endDate`, `status`, `hasFingerprint`, `fingerprint_id`) VALUES
(170, '', '', 0, '', '', 0, 0.00, 0, 0.00, '0000-00-00', '0000-00-00', NULL, 1, 0),
(171, '', '', 0, '', '', 0, 0.00, 0, 0.00, '0000-00-00', '0000-00-00', NULL, 1, 0),
(172, '', '', 0, '', '', 0, 0.00, 0, 0.00, '0000-00-00', '0000-00-00', NULL, 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `memberId` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `memberId`, `amount`, `date`) VALUES
(118, 0, 900.00, '2025-01-01'),
(119, 0, 900.00, '2025-01-01'),
(120, 0, 900.00, '2025-01-01'),
(121, 0, 900.00, '2025-01-01'),
(122, 0, 900.00, '2025-01-01'),
(123, 0, 900.00, '2025-01-01'),
(124, 0, 900.00, '2025-01-01'),
(125, 0, 900.00, '2025-01-01'),
(126, 0, 900.00, '2025-01-01'),
(127, 0, 900.00, '2025-01-01'),
(128, 0, 900.00, '2025-01-01'),
(129, 0, 900.00, '2025-01-02'),
(130, 0, 900.00, '2025-01-01'),
(131, 0, 1800.00, '2025-01-01'),
(132, 0, 1800.00, '2025-01-01'),
(133, 71, 900.00, '2025-01-01'),
(134, 0, 900.00, '2025-01-12'),
(135, 0, 1800.00, '2024-12-31'),
(136, 0, 900.00, '2025-01-12'),
(137, 75, 900.00, '2025-01-12'),
(138, 77, 900.00, '2025-01-01'),
(139, 0, 900.00, '2025-02-04'),
(140, 0, 900.00, '2025-02-04'),
(141, 0, 100.00, '2025-02-04'),
(142, 0, 1800.00, '2025-02-04');

-- --------------------------------------------------------

--
-- Table structure for table `scan_logs`
--

CREATE TABLE `scan_logs` (
  `id` int(11) NOT NULL,
  `member_id` int(11) DEFAULT NULL,
  `scan_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `scan_logs`
--

INSERT INTO `scan_logs` (`id`, `member_id`, `scan_time`) VALUES
(135, 170, '2025-02-07 20:35:06'),
(136, 170, '2025-02-07 20:35:14'),
(137, 170, '2025-02-07 20:42:43'),
(138, 171, '2025-02-07 20:44:03'),
(139, 170, '2025-02-08 03:34:26'),
(140, 171, '2025-02-08 03:34:34');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `ID` int(10) DEFAULT NULL,
  `Email` varchar(50) NOT NULL,
  `Password` text NOT NULL,
  `fname` varchar(50) NOT NULL,
  `lname` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`ID`, `Email`, `Password`, `fname`, `lname`) VALUES
(NULL, 'natsumeza01@gmail.com', '$2b$10$.tNBajG4PvCMPncQQu1lhu21xp/WY2nD10b1JFqy9Mc4D.y77mHtO', 'benn', 'rara');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `dailymembers`
--
ALTER TABLE `dailymembers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `fingerprints`
--
ALTER TABLE `fingerprints`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `member_id` (`member_id`);

--
-- Indexes for table `members`
--
ALTER TABLE `members`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payments_ibfk_1` (`memberId`);

--
-- Indexes for table `scan_logs`
--
ALTER TABLE `scan_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `scan_logs_ibfk_1` (`member_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `dailymembers`
--
ALTER TABLE `dailymembers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `fingerprints`
--
ALTER TABLE `fingerprints`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=96;

--
-- AUTO_INCREMENT for table `members`
--
ALTER TABLE `members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=173;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=143;

--
-- AUTO_INCREMENT for table `scan_logs`
--
ALTER TABLE `scan_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=141;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `scan_logs`
--
ALTER TABLE `scan_logs`
  ADD CONSTRAINT `scan_logs_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

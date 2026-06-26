package com.bank_application.backend.repository;

//This is User's Repository

import org.springframework.data.jpa.repository.JpaRepository;

import com.bank_application.backend.entity.User;

public interface UserRepo extends JpaRepository<User, Long> {

	User getByMobileNumber(String mobileNumber);

	User getByEmail(String email);

}

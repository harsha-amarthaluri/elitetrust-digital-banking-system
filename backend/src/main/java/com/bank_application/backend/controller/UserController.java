package com.bank_application.backend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.bank_application.backend.entity.User;
import com.bank_application.backend.services.UserService;

@RestController
@RequestMapping("/user")
public class UserController {
	
	@Autowired
	private UserService userService;
	
	@GetMapping
	public ResponseEntity<List<User>> getAllUsers() {
		return new ResponseEntity<>(userService.getAllUser(),HttpStatus.OK);
	}
	
	@GetMapping("/{mobileNumber}")
	public ResponseEntity<User> getById(@PathVariable String mobileNumber ) {
		User user = userService.getUser(mobileNumber);
		
		if(user != null) 
			return new ResponseEntity<>(user, HttpStatus.OK);
		
		return new ResponseEntity<>(HttpStatus.NOT_FOUND);
	}
	
	@PostMapping
	public ResponseEntity<?> createUser(@RequestBody User user) {
		String mobile = user.getMobileNumber();
		if (mobile == null || !mobile.matches("^[0-9]{10}$")) {
			return ResponseEntity.badRequest().body("Mobile number must be exactly 10 digits.");
		}
		
		User newUser = userService.createUser(user);
		if(newUser != null) {
			return new ResponseEntity<>(newUser, HttpStatus.CREATED);
		}
		
		return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
	}
	
	@PutMapping("/{id}")
	public ResponseEntity<User> updateUser(@PathVariable Long id,@RequestBody User user) {
		User updatedUser = userService.updateUser(id, user);
		return ResponseEntity.ok(updatedUser);
		
	}
	
	@DeleteMapping("/{id}")
	public ResponseEntity<String> deleteUser(@PathVariable Long id){
	    userService.deleteUser(id);
	    return ResponseEntity.ok("User deleted successfully");
	}
}

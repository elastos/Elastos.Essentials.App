//SPDX-License-Identifier: UNLICENSED

/*
 * Very basic test ERC20 contract for the trinity tech demo token used in the elastOS wallet.
 * 20200916: This contract can be compiled only with solidity 0.4 because the Elastos ETH sidechain
 * only supports this version for now.
 */

pragma solidity ^0.4.0;

contract TTECHERC20 {
    string public constant name = "Trinity Tech";
    string public constant symbol = "TTECH";
    uint8 public constant decimals = 18;

    event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
    event Transfer(address indexed from, address indexed to, uint tokens);

    mapping(address => uint256) balances;

    mapping(address => mapping (address => uint256)) allowed;

    uint256 totalSupply_;

    using SafeMath for uint256;

   constructor(uint256 total) public {
    	totalSupply_ = total; // Careful here, total must be an amount that represents units*number of decimals. 1000 tokens with 2 decimals require totalSuppluy to be 1000*10^2 = 100000
    	balances[msg.sender] = totalSupply_;
    	emit Transfer(address(0), msg.sender, totalSupply_);
    }

    function totalSupply() public view returns (uint256) {
	return totalSupply_;
    }

    function balanceOf(address tokenOwner) public view returns (uint) {
        return balances[tokenOwner];
    }

    function transfer(address receiver, uint numTokens) public returns (bool) {
        require(numTokens <= balances[msg.sender]);
        balances[msg.sender] = balances[msg.sender].sub(numTokens);
        balances[receiver] = balances[receiver].add(numTokens);
        emit Transfer(msg.sender, receiver, numTokens);
        return true;
    }

    function approve(address delegate, uint numTokens) public returns (bool) {
        allowed[msg.sender][delegate] = numTokens;
        emit Approval(msg.sender, delegate, numTokens);
        return true;
    }

    function allowance(address owner, address delegate) public view returns (uint) {
        return allowed[owner][delegate];
    }

    function transferFrom(address owner, address buyer, uint numTokens) public returns (bool) {
        require(numTokens <= balances[owner]);
        require(numTokens <= allowed[owner][msg.sender]);

        balances[owner] = balances[owner].sub(numTokens);
        allowed[owner][msg.sender] = allowed[owner][msg.sender].sub(numTokens);
        balances[buyer] = balances[buyer].add(numTokens);
        emit Transfer(owner, buyer, numTokens);
        return true;
    }
}

library SafeMath {
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
      assert(b <= a);
      return a - b;
    }

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
      uint256 c = a + b;
      assert(c >= a);
      return c;
    }
}
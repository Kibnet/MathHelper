/**
 * Parser Module Tests
 */

import { ExpressionParser, generateId, resetIdCounter } from '../../js/core/parser.js';

export function runParserTests(runner) {
  runner.describe('Expression Parser', function() {
    
    this.it('should parse simple constant', function() {
      resetIdCounter();
      const parser = new ExpressionParser('42');
      const result = parser.parse();
      this.expect(result.type).toBe('constant');
      this.expect(result.value).toBe(42);
    });

    this.it('should parse decimal number', function() {
      const parser = new ExpressionParser('3.14');
      const result = parser.parse();
      this.expect(result.type).toBe('constant');
      this.expect(result.value).toBe(3.14);
    });

    this.it('should parse variable', function() {
      const parser = new ExpressionParser('x');
      const result = parser.parse();
      this.expect(result.type).toBe('variable');
      this.expect(result.value).toBe('x');
    });

    this.it('should parse multi-character variable', function() {
      const parser = new ExpressionParser('abc');
      const result = parser.parse();
      this.expect(result.type).toBe('variable');
      this.expect(result.value).toBe('abc');
    });

    this.it('should parse addition', function() {
      const parser = new ExpressionParser('2 + 3');
      const result = parser.parse();
      this.expect(result.type).toBe('operator');
      this.expect(result.value).toBe('+');
      this.expect(result.children).toHaveLength(2);
      this.expect(result.children[0].value).toBe(2);
      this.expect(result.children[1].value).toBe(3);
    });

    this.it('should parse subtraction', function() {
      const parser = new ExpressionParser('5 - 2');
      const result = parser.parse();
      this.expect(result.type).toBe('operator');
      this.expect(result.value).toBe('-');
    });

    this.it('should parse multiplication', function() {
      const parser = new ExpressionParser('4 * 7');
      const result = parser.parse();
      this.expect(result.type).toBe('operator');
      this.expect(result.value).toBe('*');
    });

    this.it('should parse division', function() {
      const parser = new ExpressionParser('8 / 2');
      const result = parser.parse();
      this.expect(result.type).toBe('operator');
      this.expect(result.value).toBe('/');
    });

    this.it('should respect operator precedence (multiplication before addition)', function() {
      const parser = new ExpressionParser('2 + 3 * 4');
      const result = parser.parse();
      this.expect(result.type).toBe('operator');
      this.expect(result.value).toBe('+');
      this.expect(result.children[0].value).toBe(2);
      this.expect(result.children[1].type).toBe('operator');
      this.expect(result.children[1].value).toBe('*');
    });

    this.it('should respect operator precedence (division before subtraction)', function() {
      const parser = new ExpressionParser('10 - 6 / 2');
      const result = parser.parse();
      this.expect(result.value).toBe('-');
      this.expect(result.children[1].value).toBe('/');
    });

    this.it('should parse parentheses', function() {
      const parser = new ExpressionParser('(2 + 3)');
      const result = parser.parse();
      this.expect(result.type).toBe('group');
      this.expect(result.children[0].type).toBe('operator');
    });

    this.it('should parse nested parentheses', function() {
      const parser = new ExpressionParser('((a))');
      const result = parser.parse();
      this.expect(result.type).toBe('group');
      this.expect(result.children[0].type).toBe('group');
      this.expect(result.children[0].children[0].type).toBe('variable');
    });

    this.it('should parse parentheses affecting precedence', function() {
      const parser = new ExpressionParser('(2 + 3) * 4');
      const result = parser.parse();
      this.expect(result.value).toBe('*');
      this.expect(result.children[0].type).toBe('group');
    });

    this.it('should parse unary negation', function() {
      const parser = new ExpressionParser('-5');
      const result = parser.parse();
      this.expect(result.type).toBe('unary');
      this.expect(result.value).toBe('-');
      this.expect(result.children[0].value).toBe(5);
    });

    this.it('should parse double negation', function() {
      const parser = new ExpressionParser('--7');
      const result = parser.parse();
      this.expect(result.type).toBe('unary');
      this.expect(result.children[0].type).toBe('unary');
    });

    this.it('should parse complex expression', function() {
      const parser = new ExpressionParser('2 * (a + 3) - b');
      const result = parser.parse();
      this.expect(result.type).toBe('operator');
      this.expect(result.value).toBe('-');
    });

    this.it('should handle whitespace correctly', function() {
      const parser1 = new ExpressionParser('2+3');
      const parser2 = new ExpressionParser('2 + 3');
      const parser3 = new ExpressionParser('  2   +   3  ');
      
      const result1 = parser1.parse();
      const result2 = parser2.parse();
      const result3 = parser3.parse();
      
      this.expect(result1.type).toBe(result2.type);
      this.expect(result2.type).toBe(result3.type);
    });

    this.it('should throw on empty expression', function() {
      this.expect(() => new ExpressionParser('').parse()).toThrow();
    });

    this.it('should throw on incomplete expression', function() {
      this.expect(() => new ExpressionParser('2 +').parse()).toThrow();
    });

    this.it('should throw on missing closing parenthesis', function() {
      this.expect(() => new ExpressionParser('(2 + 3').parse()).toThrow();
    });

    this.it('should throw on unexpected character', function() {
      this.expect(() => new ExpressionParser('2 @ 3').parse()).toThrow();
    });

    this.it('should throw on extra closing parenthesis', function() {
      this.expect(() => new ExpressionParser('2 + 3)').parse()).toThrow();
    });
  });
}
